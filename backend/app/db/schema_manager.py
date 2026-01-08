"""
Code-First Database Schema Manager.

Handles database creation, schema initialization, and migrations on startup.
Ensures all required tables, columns, and seed data exist.
"""

import os
import glob
import logging
from pathlib import Path
from typing import Optional, List, Dict

import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor

from app.config import get_settings

logger = logging.getLogger(__name__)


class SchemaManager:
    """
    Manages database schema initialization and migrations.
    
    Implements code-first database approach:
    - Creates database if it doesn't exist
    - Creates/updates tables and columns
    - Applies migrations idempotently
    - Seeds required lookup data
    """
    
    def __init__(self):
        self.settings = get_settings()
        self._migrations_dir = self._find_migrations_dir()
    
    def _find_migrations_dir(self) -> Path:
        """Find the migrations directory."""
        # Check multiple possible locations
        possible_paths = [
            Path(__file__).parent / "migrations",
            Path(__file__).parent.parent / "migrations",
            Path(__file__).parent.parent.parent / "migrations",
            Path("migrations"),
            Path("backend/migrations"),
        ]
        
        for path in possible_paths:
            if path.exists() and path.is_dir():
                return path
        
        # Default to relative path from this file
        return Path(__file__).parent.parent.parent / "migrations"
    
    def _get_maintenance_connection(self):
        """
        Get connection to postgres maintenance database.
        Used for database creation.
        """
        return psycopg2.connect(
            host=self.settings.db_host,
            port=self.settings.db_port,
            user=self.settings.db_user,
            password=self.settings.db_password,
            database="postgres",
        )
    
    def _get_app_connection(self):
        """Get connection to the application database."""
        return psycopg2.connect(
            host=self.settings.db_host,
            port=self.settings.db_port,
            user=self.settings.db_user,
            password=self.settings.db_password,
            database=self.settings.db_name,
        )
    
    def ensure_database_exists(self) -> bool:
        """
        Ensure the application database exists.
        Creates it if it doesn't exist.
        
        Returns:
            True if database was created, False if it already existed
        """
        db_name = self.settings.db_name
        created = False
        
        conn = self._get_maintenance_connection()
        conn.autocommit = True
        
        try:
            with conn.cursor() as cur:
                # Check if database exists
                cur.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s",
                    (db_name,)
                )
                exists = cur.fetchone() is not None
                
                if not exists:
                    logger.info(f"Creating database: {db_name}")
                    # Use sql.Identifier to safely quote the database name
                    cur.execute(
                        sql.SQL("CREATE DATABASE {}").format(
                            sql.Identifier(db_name)
                        )
                    )
                    created = True
                    logger.info(f"Database {db_name} created successfully")
                else:
                    logger.debug(f"Database {db_name} already exists")
        finally:
            conn.close()
        
        return created
    
    def ensure_schema_version_table(self) -> None:
        """
        Ensure the SchemaVersion table exists.
        This table tracks applied migrations.
        """
        conn = self._get_app_connection()
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS "SchemaVersion" (
                        "SchemaVersionID"    SERIAL PRIMARY KEY,
                        "Version"            VARCHAR(20) NOT NULL,
                        "MigrationFile"      VARCHAR(100) NOT NULL,
                        "AppliedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
                        "Description"        TEXT NULL
                    )
                """)
                conn.commit()
                logger.debug("SchemaVersion table ensured")
        finally:
            conn.close()
    
    def get_applied_migrations(self) -> Dict[str, dict]:
        """
        Get list of already applied migrations.
        
        Returns:
            Dictionary mapping migration filename to migration info
        """
        conn = self._get_app_connection()
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                try:
                    cur.execute("""
                        SELECT "MigrationFile", "AppliedDate", "Version"
                        FROM "SchemaVersion"
                        ORDER BY "SchemaVersionID"
                    """)
                    return {row["MigrationFile"]: dict(row) for row in cur.fetchall()}
                except psycopg2.errors.UndefinedTable:
                    return {}
        finally:
            conn.close()
    
    def get_migration_files(self) -> List[Path]:
        """
        Get list of migration files in order.
        
        Returns:
            List of migration file paths sorted by name
        """
        if not self._migrations_dir.exists():
            logger.warning(f"Migrations directory not found: {self._migrations_dir}")
            return []
        
        files = sorted(self._migrations_dir.glob("*.sql"))
        # Exclude full_schema.sql as it's for reference only
        return [f for f in files if f.name != "full_schema.sql"]
    
    def apply_migration(self, migration_file: Path) -> bool:
        """
        Apply a single migration file.
        
        Args:
            migration_file: Path to the migration SQL file
            
        Returns:
            True if migration was applied successfully
        """
        logger.info(f"Applying migration: {migration_file.name}")
        
        sql_content = migration_file.read_text(encoding="utf-8")
        
        conn = self._get_app_connection()
        
        try:
            with conn.cursor() as cur:
                cur.execute(sql_content)
            conn.commit()
            logger.info(f"Migration {migration_file.name} applied successfully")
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Migration {migration_file.name} failed: {e}")
            raise
        finally:
            conn.close()
    
    def run_migrations(self, force: bool = False) -> int:
        """
        Run all pending migrations.
        
        Args:
            force: If True, re-run all migrations regardless of status
            
        Returns:
            Number of migrations applied
        """
        self.ensure_schema_version_table()
        
        migration_files = self.get_migration_files()
        applied = self.get_applied_migrations()
        
        pending = []
        for f in migration_files:
            if f.name not in applied or force:
                pending.append(f)
        
        if not pending:
            logger.info("All migrations are already applied")
            return 0
        
        logger.info(f"Found {len(pending)} pending migration(s)")
        
        applied_count = 0
        for migration_file in pending:
            if self.apply_migration(migration_file):
                applied_count += 1
        
        logger.info(f"Successfully applied {applied_count} migration(s)")
        return applied_count
    
    def check_table_exists(self, table_name: str) -> bool:
        """
        Check if a table exists in the database.
        
        Args:
            table_name: Name of the table to check
            
        Returns:
            True if table exists
        """
        conn = self._get_app_connection()
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = %s
                """, (table_name,))
                return cur.fetchone() is not None
        finally:
            conn.close()
    
    def check_column_exists(self, table_name: str, column_name: str) -> bool:
        """
        Check if a column exists in a table.
        
        Args:
            table_name: Name of the table
            column_name: Name of the column
            
        Returns:
            True if column exists
        """
        conn = self._get_app_connection()
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = %s AND column_name = %s
                """, (table_name, column_name))
                return cur.fetchone() is not None
        finally:
            conn.close()
    
    def add_column_if_not_exists(
        self, 
        table_name: str, 
        column_name: str, 
        column_definition: str
    ) -> bool:
        """
        Add a column to a table if it doesn't exist.
        
        Args:
            table_name: Name of the table
            column_name: Name of the column
            column_definition: SQL column definition (e.g., "VARCHAR(100) NULL")
            
        Returns:
            True if column was added, False if it already existed
        """
        if self.check_column_exists(table_name, column_name):
            return False
        
        conn = self._get_app_connection()
        
        try:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL("ALTER TABLE {} ADD COLUMN {} {}").format(
                        sql.Identifier(table_name),
                        sql.Identifier(column_name),
                        sql.SQL(column_definition)
                    )
                )
            conn.commit()
            logger.info(f"Added column {column_name} to table {table_name}")
            return True
        finally:
            conn.close()
    
    def ensure_seed_data(self) -> None:
        """
        Ensure required seed data exists.
        Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
        """
        conn = self._get_app_connection()
        
        try:
            with conn.cursor() as cur:
                # Panel Status values
                cur.execute("""
                    INSERT INTO "PanelStatus" ("PanelStatusID", "StatusTitle", "StatusDescription")
                    VALUES 
                        (10, 'Connected', 'Panel is connected and operational'),
                        (20, 'Connecting', 'Connection attempt in progress'),
                        (30, 'Error', 'Connection failed or authentication error'),
                        (40, 'Disabled', 'Panel manually disabled by user')
                    ON CONFLICT ("PanelStatusID") DO NOTHING
                """)
                
                # Node Status values
                cur.execute("""
                    INSERT INTO "NodeStatus" ("NodeStatusID", "StatusTitle", "StatusDescription")
                    VALUES 
                        (10, 'Connected', 'Node is connected and operational'),
                        (20, 'Connecting', 'Connection attempt in progress'),
                        (30, 'Error', 'Connection failed or node unreachable'),
                        (40, 'Disabled', 'Node manually disabled by user')
                    ON CONFLICT ("NodeStatusID") DO NOTHING
                """)
                
                # Default Application Settings
                cur.execute("""
                    INSERT INTO "AppSetting" ("SettingKey", "SettingValue", "SettingDescription")
                    VALUES 
                        ('DEFAULT_SERVICE_PORT', '62050', 'Default node service port'),
                        ('DEFAULT_API_PORT', '62051', 'Default node API port'),
                        ('DEFAULT_USAGE_COEFFICIENT', '1.0', 'Default traffic usage coefficient'),
                        ('ENCRYPTION_KEY_ID', 'key_v1', 'Current encryption key identifier'),
                        ('DEFAULT_SSH_PORT', '22', 'Default SSH port'),
                        ('DEFAULT_SSH_USERNAME', 'root', 'Default SSH username'),
                        ('AUTO_SYNC_INTERVAL_MINUTES', '5', 'Automatic panel sync interval'),
                        ('MAX_CONNECTION_RETRIES', '3', 'Maximum connection retry attempts'),
                        ('CONNECTION_TIMEOUT_SECONDS', '30', 'Connection timeout in seconds')
                    ON CONFLICT ("SettingKey") DO NOTHING
                """)
                
            conn.commit()
            logger.debug("Seed data ensured")
        except psycopg2.errors.UndefinedTable:
            # Tables don't exist yet, will be created by migrations
            conn.rollback()
            logger.debug("Skipping seed data - tables not yet created")
        finally:
            conn.close()
    
    def initialize(self) -> None:
        """
        Full database initialization.
        
        This is the main entry point for ensuring the database is ready.
        Should be called during application startup.
        """
        logger.info("Starting database initialization...")
        
        # Step 1: Ensure database exists
        db_created = self.ensure_database_exists()
        if db_created:
            logger.info("New database created")
        
        # Step 2: Run migrations
        migrations_applied = self.run_migrations()
        if migrations_applied > 0:
            logger.info(f"Applied {migrations_applied} migration(s)")
        
        # Step 3: Ensure seed data
        self.ensure_seed_data()
        
        logger.info("Database initialization complete")
    
    def get_schema_version(self) -> Optional[str]:
        """
        Get the current schema version.
        
        Returns:
            Version string or None if no migrations applied
        """
        conn = self._get_app_connection()
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT "Version" FROM "SchemaVersion"
                    ORDER BY "SchemaVersionID" DESC
                    LIMIT 1
                """)
                row = cur.fetchone()
                return row[0] if row else None
        except psycopg2.errors.UndefinedTable:
            return None
        finally:
            conn.close()


# Singleton instance
_schema_manager: Optional[SchemaManager] = None


def get_schema_manager() -> SchemaManager:
    """Get the schema manager instance."""
    global _schema_manager
    if _schema_manager is None:
        _schema_manager = SchemaManager()
    return _schema_manager


def ensure_database_ready() -> None:
    """
    Ensure database is ready for use.
    
    Convenience function for application startup.
    """
    manager = get_schema_manager()
    manager.initialize()
