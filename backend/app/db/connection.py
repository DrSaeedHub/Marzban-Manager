"""
Database connection utilities for Marzban-Manager.

Provides connection pooling and context management for PostgreSQL connections.
"""

import os
from typing import Optional
from contextlib import contextmanager

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor


# Global connection pool
_pool: Optional[ThreadedConnectionPool] = None


def get_database_url() -> str:
    """
    Get database URL from environment variables.

    Supports either DATABASE_URL or individual DB_* variables.

    Returns:
        PostgreSQL connection string
    """
    db_url = os.environ.get("DATABASE_URL")

    if not db_url:
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


def get_database_params() -> dict:
    """
    Get database connection parameters as dictionary.
    
    Returns:
        Dictionary with host, port, user, password, database keys
    """
    return {
        "host": os.environ.get("DB_HOST", "localhost"),
        "port": int(os.environ.get("DB_PORT", "5432")),
        "user": os.environ.get("DB_USER", "postgres"),
        "password": os.environ.get("DB_PASSWORD", ""),
        "database": os.environ.get("DB_NAME", "MarzbanManager"),
    }


def init_pool(min_connections: int = 2, max_connections: int = 10) -> None:
    """
    Initialize the connection pool.

    Args:
        min_connections: Minimum number of connections to maintain
        max_connections: Maximum number of connections allowed
    """
    global _pool

    if _pool is not None:
        return

    db_url = get_database_url()
    _pool = ThreadedConnectionPool(
        minconn=min_connections,
        maxconn=max_connections,
        dsn=db_url
    )


def close_pool() -> None:
    """Close all connections in the pool."""
    global _pool

    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_connection():
    """
    Get a database connection from the pool.

    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM ...")

    Yields:
        psycopg2 connection object
    """
    global _pool

    if _pool is None:
        init_pool()

    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


class DatabaseConnection:
    """
    Database connection wrapper with context management.

    Provides convenient methods for common database operations.

    Usage:
        with DatabaseConnection() as db:
            result = db.fetch_one("SELECT * FROM ... WHERE id = %s", (1,))
            db.execute("UPDATE ... SET ... WHERE id = %s", (1,))
    """

    def __init__(self):
        self._conn = None
        self._cursor = None

    def __enter__(self):
        global _pool

        if _pool is None:
            init_pool()

        self._conn = _pool.getconn()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        global _pool

        if exc_type is not None:
            self._conn.rollback()
        else:
            self._conn.commit()

        if self._cursor is not None:
            self._cursor.close()

        _pool.putconn(self._conn)
        self._conn = None
        self._cursor = None

        return False

    @property
    def cursor(self):
        """Get a cursor with RealDictCursor factory."""
        if self._cursor is None:
            self._cursor = self._conn.cursor(cursor_factory=RealDictCursor)
        return self._cursor

    @property
    def connection(self):
        """Get the underlying connection."""
        return self._conn

    def execute(self, query: str, params: tuple = None) -> None:
        """
        Execute a query without returning results.

        Args:
            query: SQL query string
            params: Query parameters
        """
        self.cursor.execute(query, params)

    def fetch_one(self, query: str, params: tuple = None) -> Optional[dict]:
        """
        Execute a query and return single result.

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            Dictionary with column names as keys, or None if no result
        """
        self.cursor.execute(query, params)
        return self.cursor.fetchone()

    def fetch_all(self, query: str, params: tuple = None) -> list:
        """
        Execute a query and return all results.

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            List of dictionaries with column names as keys
        """
        self.cursor.execute(query, params)
        return self.cursor.fetchall()

    def fetch_value(self, query: str, params: tuple = None):
        """
        Execute a query and return single value.

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            Single value from first column of first row, or None
        """
        cur = self._conn.cursor()
        try:
            cur.execute(query, params)
            row = cur.fetchone()
            return row[0] if row else None
        finally:
            cur.close()

    def insert_returning_id(self, query: str, params: tuple = None) -> int:
        """
        Execute an INSERT query with RETURNING clause.

        Args:
            query: SQL INSERT query with RETURNING id
            params: Query parameters

        Returns:
            The returned ID value
        """
        cur = self._conn.cursor()
        try:
            cur.execute(query, params)
            return cur.fetchone()[0]
        finally:
            cur.close()
