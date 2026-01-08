"""
Audit Log Repository.

Data access layer for AuditLog table.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from app.repositories.base import BaseRepository
from app.db.connection import DatabaseConnection


class AuditRepository(BaseRepository):
    """Repository for AuditLog operations."""
    
    table_name = "AuditLog"
    primary_key = "AuditLogID"
    supports_soft_delete = False
    
    def log_action(
        self,
        entity_type: str,
        entity_id: int,
        action_type: str,
        description: str = None,
        old_value: dict = None,
        new_value: dict = None,
        performed_by_user_id: int = None,
        performed_by_ip: str = None
    ) -> Dict[str, Any]:
        """
        Create an audit log entry.
        
        Args:
            entity_type: Type of entity (Panel, Node, Template, etc.)
            entity_id: ID of the entity
            action_type: Type of action (CREATE, UPDATE, DELETE, etc.)
            description: Human-readable description
            old_value: Previous value (for updates)
            new_value: New value (for creates/updates)
            performed_by_user_id: User who performed action
            performed_by_ip: IP address of requester
            
        Returns:
            Created audit log entry
        """
        data = {
            "EntityType": entity_type,
            "EntityID": entity_id,
            "ActionType": action_type,
            "ActionDescription": description,
        }
        
        if old_value:
            data["OldValue"] = json.dumps(old_value)
        
        if new_value:
            data["NewValue"] = json.dumps(new_value)
        
        if performed_by_user_id:
            data["PerformedByUserID"] = performed_by_user_id
        
        if performed_by_ip:
            data["PerformedByIP"] = performed_by_ip
        
        return self.insert(data)
    
    def find_by_entity(
        self,
        entity_type: str,
        entity_id: int,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get audit logs for a specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: ID of the entity
            limit: Maximum records to return
            
        Returns:
            List of audit log entries
        """
        return self.find_all(
            where={"EntityType": entity_type, "EntityID": entity_id},
            order_by='"CreatedDate" DESC',
            limit=limit
        )
    
    def find_by_action_type(
        self,
        action_type: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get audit logs by action type.
        
        Args:
            action_type: Type of action
            limit: Maximum records to return
            
        Returns:
            List of audit log entries
        """
        return self.find_all(
            where={"ActionType": action_type},
            order_by='"CreatedDate" DESC',
            limit=limit
        )
    
    def find_recent(
        self,
        limit: int = 100,
        entity_type: str = None
    ) -> List[Dict[str, Any]]:
        """
        Get recent audit logs.
        
        Args:
            limit: Maximum records to return
            entity_type: Optional filter by entity type
            
        Returns:
            List of audit log entries
        """
        where = {}
        if entity_type:
            where["EntityType"] = entity_type
        
        return self.find_all(
            where=where if where else None,
            order_by='"CreatedDate" DESC',
            limit=limit
        )


# Convenience function for logging from services
def log_audit(
    db: DatabaseConnection,
    entity_type: str,
    entity_id: int,
    action_type: str,
    description: str = None,
    old_value: dict = None,
    new_value: dict = None,
    performed_by_ip: str = None
) -> None:
    """
    Convenience function for creating audit logs.
    
    Args:
        db: Database connection
        entity_type: Type of entity
        entity_id: ID of the entity
        action_type: Type of action
        description: Human-readable description
        old_value: Previous value
        new_value: New value
        performed_by_ip: IP address
    """
    repo = AuditRepository(db)
    repo.log_action(
        entity_type=entity_type,
        entity_id=entity_id,
        action_type=action_type,
        description=description,
        old_value=old_value,
        new_value=new_value,
        performed_by_ip=performed_by_ip
    )
