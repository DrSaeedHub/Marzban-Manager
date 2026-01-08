"""
Base Repository with Generic CRUD Operations.

Provides common database operations that can be inherited by specific repositories.
"""

from typing import Generic, TypeVar, Optional, List, Dict, Any, Type
from datetime import datetime
from abc import ABC, abstractmethod

from psycopg2.extras import RealDictCursor
from psycopg2 import sql

from app.db.connection import DatabaseConnection

# Generic type for entity models
T = TypeVar("T")


class BaseRepository(ABC, Generic[T]):
    """
    Abstract base repository providing common CRUD operations.
    
    Subclasses must define:
    - table_name: The database table name
    - primary_key: The primary key column name
    - entity_class: Optional Pydantic model class for response mapping
    
    Usage:
        class PanelRepository(BaseRepository[PanelResponse]):
            table_name = "MarzbanPanel"
            primary_key = "MarzbanPanelID"
    """
    
    # To be overridden by subclasses
    table_name: str = ""
    primary_key: str = ""
    supports_soft_delete: bool = True
    
    def __init__(self, db: DatabaseConnection):
        """
        Initialize repository with database connection.
        
        Args:
            db: DatabaseConnection instance
        """
        self.db = db
    
    def _build_select(
        self,
        columns: List[str] = None,
        where: Dict[str, Any] = None,
        order_by: str = None,
        limit: int = None,
        offset: int = None,
        include_deleted: bool = False
    ) -> tuple:
        """
        Build a SELECT query with parameters.
        
        Args:
            columns: List of columns to select (None = all)
            where: Dictionary of column-value pairs for WHERE clause
            order_by: ORDER BY clause
            limit: LIMIT value
            offset: OFFSET value
            include_deleted: Include soft-deleted records
            
        Returns:
            Tuple of (query_string, params_list)
        """
        # Build column list
        if columns:
            col_str = ", ".join(f'"{c}"' for c in columns)
        else:
            col_str = "*"
        
        query = f'SELECT {col_str} FROM "{self.table_name}"'
        params = []
        
        # Build WHERE clause
        conditions = []
        if where:
            for col, val in where.items():
                if val is None:
                    conditions.append(f'"{col}" IS NULL')
                else:
                    conditions.append(f'"{col}" = %s')
                    params.append(val)
        
        # Add soft delete filter
        if self.supports_soft_delete and not include_deleted:
            conditions.append('"IsDeleted" = FALSE')
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        # Add ORDER BY
        if order_by:
            query += f" ORDER BY {order_by}"
        
        # Add LIMIT/OFFSET
        if limit:
            query += " LIMIT %s"
            params.append(limit)
        
        if offset:
            query += " OFFSET %s"
            params.append(offset)
        
        return query, tuple(params)
    
    def find_all(
        self,
        where: Dict[str, Any] = None,
        order_by: str = None,
        limit: int = None,
        offset: int = None,
        include_deleted: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Find all records matching criteria.
        
        Args:
            where: Filter conditions
            order_by: Sort order
            limit: Maximum records to return
            offset: Number of records to skip
            include_deleted: Include soft-deleted records
            
        Returns:
            List of record dictionaries
        """
        query, params = self._build_select(
            where=where,
            order_by=order_by,
            limit=limit,
            offset=offset,
            include_deleted=include_deleted
        )
        return self.db.fetch_all(query, params)
    
    def find_one(
        self,
        where: Dict[str, Any],
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Find a single record matching criteria.
        
        Args:
            where: Filter conditions
            include_deleted: Include soft-deleted records
            
        Returns:
            Record dictionary or None
        """
        query, params = self._build_select(
            where=where,
            limit=1,
            include_deleted=include_deleted
        )
        return self.db.fetch_one(query, params)
    
    def find_by_id(
        self,
        id: int,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Find record by primary key.
        
        Args:
            id: Primary key value
            include_deleted: Include soft-deleted records
            
        Returns:
            Record dictionary or None
        """
        return self.find_one({self.primary_key: id}, include_deleted=include_deleted)
    
    def count(
        self,
        where: Dict[str, Any] = None,
        include_deleted: bool = False
    ) -> int:
        """
        Count records matching criteria.
        
        Args:
            where: Filter conditions
            include_deleted: Include soft-deleted records
            
        Returns:
            Number of matching records
        """
        query = f'SELECT COUNT(*) FROM "{self.table_name}"'
        params = []
        
        conditions = []
        if where:
            for col, val in where.items():
                if val is None:
                    conditions.append(f'"{col}" IS NULL')
                else:
                    conditions.append(f'"{col}" = %s')
                    params.append(val)
        
        if self.supports_soft_delete and not include_deleted:
            conditions.append('"IsDeleted" = FALSE')
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        return self.db.fetch_value(query, tuple(params))
    
    def exists(
        self,
        where: Dict[str, Any],
        include_deleted: bool = False
    ) -> bool:
        """
        Check if any record matches criteria.
        
        Args:
            where: Filter conditions
            include_deleted: Include soft-deleted records
            
        Returns:
            True if any matching record exists
        """
        return self.count(where, include_deleted) > 0
    
    def insert(
        self,
        data: Dict[str, Any],
        returning: List[str] = None
    ) -> Dict[str, Any]:
        """
        Insert a new record.
        
        Args:
            data: Dictionary of column-value pairs
            returning: List of columns to return (default: all)
            
        Returns:
            Inserted record dictionary
        """
        columns = list(data.keys())
        values = list(data.values())
        
        col_str = ", ".join(f'"{c}"' for c in columns)
        val_placeholders = ", ".join(["%s"] * len(values))
        
        query = f'INSERT INTO "{self.table_name}" ({col_str}) VALUES ({val_placeholders})'
        
        if returning:
            return_str = ", ".join(f'"{c}"' for c in returning)
        else:
            return_str = "*"
        
        query += f" RETURNING {return_str}"
        
        self.db.cursor.execute(query, tuple(values))
        return dict(self.db.cursor.fetchone())
    
    def update(
        self,
        id: int,
        data: Dict[str, Any],
        returning: List[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update a record by primary key.
        
        Args:
            id: Primary key value
            data: Dictionary of column-value pairs to update
            returning: List of columns to return
            
        Returns:
            Updated record dictionary or None if not found
        """
        if not data:
            return self.find_by_id(id)
        
        # Add updated timestamp if table supports it
        data["UpdatedDate"] = datetime.utcnow()
        
        set_parts = []
        values = []
        for col, val in data.items():
            set_parts.append(f'"{col}" = %s')
            values.append(val)
        
        values.append(id)
        
        query = f'UPDATE "{self.table_name}" SET {", ".join(set_parts)} WHERE "{self.primary_key}" = %s'
        
        if returning:
            return_str = ", ".join(f'"{c}"' for c in returning)
        else:
            return_str = "*"
        
        query += f" RETURNING {return_str}"
        
        self.db.cursor.execute(query, tuple(values))
        result = self.db.cursor.fetchone()
        return dict(result) if result else None
    
    def update_where(
        self,
        where: Dict[str, Any],
        data: Dict[str, Any]
    ) -> int:
        """
        Update records matching criteria.
        
        Args:
            where: Filter conditions
            data: Dictionary of column-value pairs to update
            
        Returns:
            Number of records updated
        """
        if not data or not where:
            return 0
        
        data["UpdatedDate"] = datetime.utcnow()
        
        set_parts = []
        values = []
        for col, val in data.items():
            set_parts.append(f'"{col}" = %s')
            values.append(val)
        
        where_parts = []
        for col, val in where.items():
            if val is None:
                where_parts.append(f'"{col}" IS NULL')
            else:
                where_parts.append(f'"{col}" = %s')
                values.append(val)
        
        query = f'UPDATE "{self.table_name}" SET {", ".join(set_parts)} WHERE {" AND ".join(where_parts)}'
        
        self.db.cursor.execute(query, tuple(values))
        return self.db.cursor.rowcount
    
    def delete(self, id: int, hard: bool = False) -> bool:
        """
        Delete a record by primary key.
        
        Args:
            id: Primary key value
            hard: If True, perform hard delete; otherwise soft delete
            
        Returns:
            True if record was deleted
        """
        if hard or not self.supports_soft_delete:
            query = f'DELETE FROM "{self.table_name}" WHERE "{self.primary_key}" = %s'
            self.db.cursor.execute(query, (id,))
        else:
            # Soft delete
            query = f'''
                UPDATE "{self.table_name}" 
                SET "IsDeleted" = TRUE, "DeletedDate" = %s, "UpdatedDate" = %s
                WHERE "{self.primary_key}" = %s AND "IsDeleted" = FALSE
            '''
            now = datetime.utcnow()
            self.db.cursor.execute(query, (now, now, id))
        
        return self.db.cursor.rowcount > 0
    
    def delete_where(self, where: Dict[str, Any], hard: bool = False) -> int:
        """
        Delete records matching criteria.
        
        Args:
            where: Filter conditions
            hard: If True, perform hard delete
            
        Returns:
            Number of records deleted
        """
        if not where:
            return 0
        
        where_parts = []
        values = []
        for col, val in where.items():
            if val is None:
                where_parts.append(f'"{col}" IS NULL')
            else:
                where_parts.append(f'"{col}" = %s')
                values.append(val)
        
        if hard or not self.supports_soft_delete:
            query = f'DELETE FROM "{self.table_name}" WHERE {" AND ".join(where_parts)}'
        else:
            now = datetime.utcnow()
            query = f'''
                UPDATE "{self.table_name}" 
                SET "IsDeleted" = TRUE, "DeletedDate" = %s, "UpdatedDate" = %s
                WHERE {" AND ".join(where_parts)} AND "IsDeleted" = FALSE
            '''
            values = [now, now] + values
        
        self.db.cursor.execute(query, tuple(values))
        return self.db.cursor.rowcount
    
    def restore(self, id: int) -> bool:
        """
        Restore a soft-deleted record.
        
        Args:
            id: Primary key value
            
        Returns:
            True if record was restored
        """
        if not self.supports_soft_delete:
            return False
        
        query = f'''
            UPDATE "{self.table_name}" 
            SET "IsDeleted" = FALSE, "DeletedDate" = NULL, "UpdatedDate" = %s
            WHERE "{self.primary_key}" = %s AND "IsDeleted" = TRUE
        '''
        self.db.cursor.execute(query, (datetime.utcnow(), id))
        return self.db.cursor.rowcount > 0
