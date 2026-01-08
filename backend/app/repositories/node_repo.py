"""
Node Repository.

Data access layer for Node and NodeTemplateAssignment tables.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime

from app.repositories.base import BaseRepository
from app.db.connection import DatabaseConnection


class NodeRepository(BaseRepository):
    """Repository for Node operations."""
    
    table_name = "Node"
    primary_key = "NodeID"
    supports_soft_delete = True
    
    def find_by_panel_id(
        self,
        panel_id: int,
        include_deleted: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all nodes for a panel.
        
        Args:
            panel_id: Panel ID
            include_deleted: Include soft-deleted nodes
            
        Returns:
            List of node dictionaries
        """
        query = '''
            SELECT 
                n.*,
                ns."StatusTitle" as status_name,
                COALESCE(
                    json_agg(
                        ct."Tag" ORDER BY ct."Tag"
                    ) FILTER (WHERE ct."Tag" IS NOT NULL),
                    '[]'
                ) as assigned_templates
            FROM "Node" n
            LEFT JOIN "NodeStatus" ns ON n."NodeStatusID" = ns."NodeStatusID"
            LEFT JOIN "NodeTemplateAssignment" nta ON n."NodeID" = nta."NodeID"
            LEFT JOIN "ConfigurationTemplate" ct ON nta."ConfigurationTemplateID" = ct."ConfigurationTemplateID"
                AND ct."IsDeleted" = FALSE
            WHERE n."MarzbanPanelID" = %s
        '''
        
        if not include_deleted:
            query += ' AND n."IsDeleted" = FALSE'
        
        query += ' GROUP BY n."NodeID", ns."StatusTitle" ORDER BY n."NodeName"'
        
        return self.db.fetch_all(query, (panel_id,))
    
    def find_by_id_with_details(
        self,
        node_id: int,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get node by ID with assigned templates.
        
        Args:
            node_id: Node ID
            include_deleted: Include soft-deleted records
            
        Returns:
            Node dictionary with template info
        """
        query = '''
            SELECT 
                n.*,
                ns."StatusTitle" as status_name,
                p."PanelName",
                p."PanelURL",
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ct."ConfigurationTemplateID",
                            'tag', ct."Tag"
                        ) ORDER BY ct."Tag"
                    ) FILTER (WHERE ct."Tag" IS NOT NULL),
                    '[]'
                ) as assigned_templates
            FROM "Node" n
            LEFT JOIN "NodeStatus" ns ON n."NodeStatusID" = ns."NodeStatusID"
            LEFT JOIN "MarzbanPanel" p ON n."MarzbanPanelID" = p."MarzbanPanelID"
            LEFT JOIN "NodeTemplateAssignment" nta ON n."NodeID" = nta."NodeID"
            LEFT JOIN "ConfigurationTemplate" ct ON nta."ConfigurationTemplateID" = ct."ConfigurationTemplateID"
                AND ct."IsDeleted" = FALSE
            WHERE n."NodeID" = %s
        '''
        
        if not include_deleted:
            query += ' AND n."IsDeleted" = FALSE'
        
        query += ' GROUP BY n."NodeID", ns."StatusTitle", p."PanelName", p."PanelURL"'
        
        return self.db.fetch_one(query, (node_id,))
    
    def find_by_name_in_panel(
        self,
        panel_id: int,
        name: str
    ) -> Optional[Dict[str, Any]]:
        """Find node by name within a panel."""
        return self.find_one({
            "MarzbanPanelID": panel_id,
            "NodeName": name
        })
    
    def find_by_address_port_in_panel(
        self,
        panel_id: int,
        address: str,
        port: int
    ) -> Optional[Dict[str, Any]]:
        """Find node by address and port within a panel."""
        return self.find_one({
            "MarzbanPanelID": panel_id,
            "Address": address,
            "ServicePort": port
        })
    
    def update_status(
        self,
        node_id: int,
        status_id: int,
        message: str = None,
        xray_version: str = None
    ) -> bool:
        """Update node connection status."""
        data = {
            "NodeStatusID": status_id,
            "StatusMessage": message,
        }
        if xray_version:
            data["XrayVersion"] = xray_version
        
        result = self.update(node_id, data)
        return result is not None
    
    def update_traffic(
        self,
        node_id: int,
        uplink: int,
        downlink: int
    ) -> bool:
        """Update node traffic statistics."""
        result = self.update(node_id, {
            "Uplink": uplink,
            "Downlink": downlink
        })
        return result is not None
    
    def count_by_panel(self, panel_id: int) -> int:
        """Count active nodes for a panel."""
        return self.count({"MarzbanPanelID": panel_id})


class NodeTemplateAssignmentRepository(BaseRepository):
    """Repository for NodeTemplateAssignment operations."""
    
    table_name = "NodeTemplateAssignment"
    primary_key = "NodeTemplateAssignmentID"
    supports_soft_delete = False
    
    def find_by_node_id(self, node_id: int) -> List[Dict[str, Any]]:
        """Get all template assignments for a node."""
        query = '''
            SELECT 
                nta.*,
                ct."Tag",
                ct."Protocol",
                ct."Transport",
                ct."Security",
                ct."Port"
            FROM "NodeTemplateAssignment" nta
            JOIN "ConfigurationTemplate" ct ON nta."ConfigurationTemplateID" = ct."ConfigurationTemplateID"
            WHERE nta."NodeID" = %s AND ct."IsDeleted" = FALSE
            ORDER BY ct."Tag"
        '''
        return self.db.fetch_all(query, (node_id,))
    
    def assign_template(
        self,
        node_id: int,
        template_id: int,
        assigned_by_user_id: int = None
    ) -> Dict[str, Any]:
        """Assign a template to a node."""
        return self.insert({
            "NodeID": node_id,
            "ConfigurationTemplateID": template_id,
            "AssignedByUserID": assigned_by_user_id,
        })
    
    def unassign_template(self, node_id: int, template_id: int) -> bool:
        """Remove template assignment from a node."""
        return self.delete_where({
            "NodeID": node_id,
            "ConfigurationTemplateID": template_id
        }, hard=True) > 0
    
    def replace_assignments(
        self,
        node_id: int,
        template_ids: List[int],
        assigned_by_user_id: int = None
    ) -> List[Dict[str, Any]]:
        """
        Replace all template assignments for a node.
        
        Args:
            node_id: Node ID
            template_ids: List of template IDs to assign
            assigned_by_user_id: Optional user ID
            
        Returns:
            List of new assignment records
        """
        # Delete existing assignments
        self.delete_where({"NodeID": node_id}, hard=True)
        
        # Create new assignments
        assignments = []
        for template_id in template_ids:
            assignment = self.assign_template(
                node_id, 
                template_id, 
                assigned_by_user_id
            )
            assignments.append(assignment)
        
        return assignments
    
    def count_by_template(self, template_id: int) -> int:
        """Count how many nodes use a template."""
        return self.count({"ConfigurationTemplateID": template_id})
