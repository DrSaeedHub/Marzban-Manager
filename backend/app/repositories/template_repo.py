"""
Template Repository.

Data access layer for ConfigurationTemplate table.
"""

from typing import Optional, List, Dict, Any
import json

from app.repositories.base import BaseRepository
from app.db.connection import DatabaseConnection


class TemplateRepository(BaseRepository):
    """Repository for ConfigurationTemplate operations."""
    
    table_name = "ConfigurationTemplate"
    primary_key = "ConfigurationTemplateID"
    supports_soft_delete = True
    
    def find_all_with_usage(
        self,
        protocol: str = None,
        transport: str = None,
        security: str = None,
        include_deleted: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all templates with usage count.
        
        Args:
            protocol: Filter by protocol
            transport: Filter by transport
            security: Filter by security
            include_deleted: Include soft-deleted records
            
        Returns:
            List of template dictionaries with used_by_nodes count
        """
        query = '''
            SELECT 
                t.*,
                COALESCE(usage.node_count, 0) as used_by_nodes
            FROM "ConfigurationTemplate" t
            LEFT JOIN (
                SELECT "ConfigurationTemplateID", COUNT(DISTINCT "NodeID") as node_count
                FROM "NodeTemplateAssignment"
                GROUP BY "ConfigurationTemplateID"
            ) usage ON t."ConfigurationTemplateID" = usage."ConfigurationTemplateID"
            WHERE 1=1
        '''
        
        params = []
        
        if not include_deleted:
            query += ' AND t."IsDeleted" = FALSE'
        
        if protocol:
            query += ' AND t."Protocol" = %s'
            params.append(protocol)
        
        if transport:
            query += ' AND t."Transport" = %s'
            params.append(transport)
        
        if security:
            query += ' AND t."Security" = %s'
            params.append(security)
        
        query += ' ORDER BY t."Tag"'
        
        return self.db.fetch_all(query, tuple(params) if params else None)
    
    def find_by_id_with_usage(
        self,
        template_id: int,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get template by ID with usage count.
        
        Args:
            template_id: Template ID
            include_deleted: Include soft-deleted records
            
        Returns:
            Template dictionary with used_by_nodes count
        """
        query = '''
            SELECT 
                t.*,
                COALESCE(usage.node_count, 0) as used_by_nodes
            FROM "ConfigurationTemplate" t
            LEFT JOIN (
                SELECT "ConfigurationTemplateID", COUNT(DISTINCT "NodeID") as node_count
                FROM "NodeTemplateAssignment"
                GROUP BY "ConfigurationTemplateID"
            ) usage ON t."ConfigurationTemplateID" = usage."ConfigurationTemplateID"
            WHERE t."ConfigurationTemplateID" = %s
        '''
        
        if not include_deleted:
            query += ' AND t."IsDeleted" = FALSE'
        
        return self.db.fetch_one(query, (template_id,))
    
    def find_by_tag(self, tag: str) -> Optional[Dict[str, Any]]:
        """Find template by tag (active only)."""
        return self.find_one({"Tag": tag})
    
    def find_by_protocol(self, protocol: str) -> List[Dict[str, Any]]:
        """Find templates by protocol."""
        return self.find_all(
            where={"Protocol": protocol},
            order_by='"Tag"'
        )
    
    def create_template(
        self,
        tag: str,
        protocol: str,
        transport: str,
        security: str,
        port: int,
        config: dict
    ) -> Dict[str, Any]:
        """
        Create a new template.
        
        Args:
            tag: Template tag/name
            protocol: Protocol type
            transport: Transport type
            security: Security type
            port: Inbound port
            config: Full configuration JSON
            
        Returns:
            Created template record
        """
        return self.insert({
            "Tag": tag,
            "Protocol": protocol,
            "Transport": transport,
            "Security": security,
            "Port": port,
            "Config": json.dumps(config),
        })
    
    def update_template(
        self,
        template_id: int,
        data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update template.
        
        Args:
            template_id: Template ID
            data: Fields to update
            
        Returns:
            Updated template or None
        """
        # Convert config dict to JSON string if present
        if "config" in data and isinstance(data["config"], dict):
            data["Config"] = json.dumps(data["config"])
            del data["config"]
        
        return self.update(template_id, data)
    
    def duplicate_template(
        self,
        template_id: int,
        new_tag: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Duplicate a template.
        
        Args:
            template_id: Source template ID
            new_tag: New tag for duplicate (default: adds " (Copy)")
            
        Returns:
            New template record or None if source not found
        """
        source = self.find_by_id(template_id)
        if not source:
            return None
        
        if not new_tag:
            new_tag = f"{source['Tag']} (Copy)"
        
        # Ensure unique tag
        counter = 1
        base_tag = new_tag
        while self.find_by_tag(new_tag):
            counter += 1
            new_tag = f"{base_tag} {counter}"
        
        return self.insert({
            "Tag": new_tag,
            "Protocol": source["Protocol"],
            "Transport": source["Transport"],
            "Security": source["Security"],
            "Port": source["Port"],
            "Config": source["Config"],
        })
