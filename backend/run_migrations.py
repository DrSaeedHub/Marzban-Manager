#!/usr/bin/env python3
"""
Database Migration Runner for Marzban-Manager

Usage:
    python run_migrations.py                    # Run all migrations
    python run_migrations.py --file 001_*.sql   # Run specific migration
    python run_migrations.py --status           # Show migration status
"""

import os
import sys
import glob
import argparse
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 is required. Install it with: pip install psycopg2-binary")
    sys.exit(1)


def get_database_url():
    """Get database URL from environment variable."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Try individual components
        host = os.environ.get("DB_HOST", "localhost")
        port = os.environ.get("DB_PORT", "5432")
        user = os.environ.get("DB_USER", "postgres")
        password = os.environ.get("DB_PASSWORD", "")
        database = os.environ.get("DB_NAME", "marzban_manager")
        
        if password:
            db_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"
        else:
            db_url = f"postgresql://{user}@{host}:{port}/{database}"
    
    return db_url


def get_migrations_dir():
    """Get the migrations directory path."""
    return Path(__file__).parent / "migrations"


def get_migration_files():
    """Get list of migration files in order."""
    migrations_dir = get_migrations_dir()
    files = sorted(glob.glob(str(migrations_dir / "*.sql")))
    return [Path(f) for f in files]


def get_applied_migrations(conn):
    """Get list of already applied migrations from SchemaVersion table."""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT "MigrationFile", "AppliedDate", "Version"
                FROM "SchemaVersion"
                ORDER BY "SchemaVersionID"
            """)
            return {row["MigrationFile"]: row for row in cur.fetchall()}
    except psycopg2.errors.UndefinedTable:
        return {}


def run_migration(conn, migration_file: Path):
    """Execute a single migration file."""
    print(f"  Running: {migration_file.name}...")
    
    sql = migration_file.read_text(encoding="utf-8")
    
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print(f"  ✓ Completed: {migration_file.name}")
        return True
    except Exception as e:
        conn.rollback()
        print(f"  ✗ Failed: {migration_file.name}")
        print(f"    Error: {e}")
        return False


def run_all_migrations(conn, force=False):
    """Run all pending migrations."""
    migration_files = get_migration_files()
    applied = get_applied_migrations(conn)
    
    pending = []
    for f in migration_files:
        if f.name not in applied or force:
            pending.append(f)
    
    if not pending:
        print("✓ All migrations are already applied.")
        return True
    
    print(f"Found {len(pending)} pending migration(s):\n")
    
    success_count = 0
    for migration_file in pending:
        if run_migration(conn, migration_file):
            success_count += 1
        else:
            print(f"\n✗ Migration stopped due to error in {migration_file.name}")
            return False
    
    print(f"\n✓ Successfully applied {success_count} migration(s).")
    return True


def show_status(conn):
    """Show migration status."""
    migration_files = get_migration_files()
    applied = get_applied_migrations(conn)
    
    print("\nMigration Status:")
    print("-" * 60)
    
    for f in migration_files:
        if f.name in applied:
            info = applied[f.name]
            date_str = info["AppliedDate"].strftime("%Y-%m-%d %H:%M:%S")
            print(f"✓ {f.name:<40} Applied: {date_str}")
        else:
            print(f"○ {f.name:<40} Pending")
    
    print("-" * 60)
    applied_count = sum(1 for f in migration_files if f.name in applied)
    print(f"Total: {len(migration_files)} | Applied: {applied_count} | Pending: {len(migration_files) - applied_count}")


def main():
    parser = argparse.ArgumentParser(description="Marzban-Manager Database Migration Runner")
    parser.add_argument("--file", "-f", help="Run a specific migration file")
    parser.add_argument("--status", "-s", action="store_true", help="Show migration status")
    parser.add_argument("--force", action="store_true", help="Force re-run migrations")
    args = parser.parse_args()
    
    db_url = get_database_url()
    
    print("Marzban-Manager Database Migration Runner")
    print("=" * 50)
    print(f"Connecting to database...")
    
    try:
        conn = psycopg2.connect(db_url)
        print("✓ Connected to database\n")
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        print("\nMake sure to set DATABASE_URL environment variable or DB_* variables:")
        print("  export DATABASE_URL='postgresql://user:password@localhost:5432/marzban_manager'")
        print("  # or")
        print("  export DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=secret DB_NAME=marzban_manager")
        sys.exit(1)
    
    try:
        if args.status:
            show_status(conn)
        elif args.file:
            migrations_dir = get_migrations_dir()
            migration_file = migrations_dir / args.file
            if not migration_file.exists():
                # Try glob pattern
                matches = list(migrations_dir.glob(args.file))
                if matches:
                    migration_file = matches[0]
                else:
                    print(f"✗ Migration file not found: {args.file}")
                    sys.exit(1)
            
            if run_migration(conn, migration_file):
                print("\n✓ Migration completed successfully.")
            else:
                sys.exit(1)
        else:
            if not run_all_migrations(conn, force=args.force):
                sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
