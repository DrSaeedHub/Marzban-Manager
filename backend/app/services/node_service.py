"""
Node Service.

Business logic for node management operations.
"""

import logging
from typing import Optional, List, Dict, Any

from app.db.connection import DatabaseConnection
from app.repositories.node_repo import NodeRepository, NodeTemplateAssignmentRepository
from app.repositories.panel_repo import PanelRepository, PanelCredentialRepository
from app.repositories.ssh_profile_repo import SSHProfileRepository
from app.repositories.audit_repo import log_audit
from app.clients.marzban_client import MarzbanClient
from app.clients.ssh_client import SSHClient
from app.clients.node_manager_client import NodeManagerClient
from app.schemas.common import StatusEnum
from app.schemas.node import NodeUpdate, NodeResponse, NodeDeleteResponse

logger = logging.getLogger(__name__)


# In-memory job storage (replace with Redis/DB in production)
_ssh_install_jobs: Dict[str, Dict[str, Any]] = {}


class NodeService:
    """Service for node management operations."""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.node_repo = NodeRepository(db)
        self.template_assignment_repo = NodeTemplateAssignmentRepository(db)
        self.panel_repo = PanelRepository(db)
        self.credential_repo = PanelCredentialRepository(db)
        self.ssh_profile_repo = SSHProfileRepository(db)
    
    def _to_response(self, node: Dict[str, Any]) -> NodeResponse:
        """Convert database record to response model."""
        return NodeResponse(
            id=node["NodeID"],
            panel_id=node["MarzbanPanelID"],
            name=node["NodeName"],
            address=node["Address"],
            service_port=node["ServicePort"],
            api_port=node["APIPort"],
            status=StatusEnum.to_string(node["NodeStatusID"]),
            status_message=node.get("StatusMessage"),
            xray_version=node.get("XrayVersion"),
            usage_coefficient=float(node["UsageCoefficient"]),
            uplink=node["Uplink"],
            downlink=node["Downlink"],
            assigned_templates=node.get("assigned_templates", []),
            ssh_profile_id=node.get("SSHProfileID"),
            created_at=node["CreatedDate"],
            updated_at=node.get("UpdatedDate"),
        )
    
    async def get_node(self, node_id: int) -> Optional[NodeResponse]:
        """Get node by ID with details."""
        node = self.node_repo.find_by_id_with_details(node_id)
        if not node:
            return None
        return self._to_response(node)
    
    async def update_node(
        self,
        node_id: int,
        data: NodeUpdate,
        client_ip: str = None
    ) -> Optional[NodeResponse]:
        """Update node details."""
        existing = self.node_repo.find_by_id(node_id)
        if not existing:
            return None
        
        # Build update data
        update_data = {}
        if data.name is not None:
            update_data["NodeName"] = data.name
        if data.address is not None:
            update_data["Address"] = data.address
        if data.service_port is not None:
            update_data["ServicePort"] = data.service_port
        if data.api_port is not None:
            update_data["APIPort"] = data.api_port
        if data.usage_coefficient is not None:
            update_data["UsageCoefficient"] = data.usage_coefficient
        
        if update_data:
            self.node_repo.update(node_id, update_data)
            
            log_audit(
                self.db,
                entity_type="Node",
                entity_id=node_id,
                action_type="UPDATE",
                description=f"Updated node '{existing['NodeName']}'",
                old_value={"name": existing["NodeName"]},
                new_value=update_data,
                performed_by_ip=client_ip,
            )
            
            logger.info(f"Updated node: {node_id}")
        
        return await self.get_node(node_id)
    
    async def delete_node(
        self,
        node_id: int,
        delete_from_marzban: bool = False,
        delete_from_server: bool = False,
        client_ip: str = None
    ) -> NodeDeleteResponse:
        """
        Delete a node with optional cascade to Marzban panel and node server.
        
        Args:
            node_id: Node ID to delete
            delete_from_marzban: Also delete from Marzban panel
            delete_from_server: Also uninstall from node server via SSH
            client_ip: Client IP for audit logging
            
        Returns:
            NodeDeleteResponse with status for each deletion layer
        """
        errors: List[str] = []
        result = NodeDeleteResponse(
            success=False,
            local=False,
            marzban=None,
            server=None,
            errors=[]
        )
        
        # Get node with full details
        existing = self.node_repo.find_by_id_with_details(node_id)
        if not existing:
            result.errors = ["Node not found"]
            return result
        
        node_name = existing["NodeName"]
        panel_id = existing["MarzbanPanelID"]
        ssh_profile_id = existing.get("SSHProfileID")
        
        # 1. Delete from Marzban panel (optional)
        if delete_from_marzban:
            result.marzban = False
            try:
                marzban_deleted = await self._delete_from_marzban(panel_id, node_name)
                result.marzban = marzban_deleted
                if marzban_deleted:
                    logger.info(f"Deleted node '{node_name}' from Marzban panel")
                else:
                    errors.append(f"Node '{node_name}' not found in Marzban panel")
            except Exception as e:
                error_msg = f"Failed to delete from Marzban: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        # 2. Uninstall from node server (optional)
        if delete_from_server:
            result.server = False
            if not ssh_profile_id:
                errors.append("Cannot uninstall from server: No SSH profile associated with this node")
            else:
                try:
                    server_deleted = await self._uninstall_from_server(ssh_profile_id, node_name)
                    result.server = server_deleted
                    if server_deleted:
                        logger.info(f"Uninstalled node '{node_name}' from server")
                    else:
                        errors.append(f"Failed to uninstall node '{node_name}' from server")
                except Exception as e:
                    error_msg = f"Failed to uninstall from server: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
        
        # 3. Always delete from local database
        try:
            local_deleted = self.node_repo.delete(node_id)
            result.local = local_deleted
            
            if local_deleted:
                log_audit(
                    self.db,
                    entity_type="Node",
                    entity_id=node_id,
                    action_type="DELETE",
                    description=f"Deleted node '{node_name}'",
                    old_value={
                        "name": node_name,
                        "delete_from_marzban": delete_from_marzban,
                        "delete_from_server": delete_from_server
                    },
                    performed_by_ip=client_ip,
                )
                logger.info(f"Deleted node from local database: {node_id}")
        except Exception as e:
            error_msg = f"Failed to delete from local database: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        result.errors = errors
        result.success = result.local  # Success if at least local deletion worked
        
        return result
    
    async def _delete_from_marzban(self, panel_id: int, node_name: str) -> bool:
        """
        Delete node from Marzban panel by matching node name.
        
        Args:
            panel_id: Panel ID
            node_name: Node name to match
            
        Returns:
            True if deleted successfully, False otherwise
        """
        client = await self._get_client(panel_id)
        if not client:
            raise ValueError("Cannot connect to panel")
        
        async with client:
            # Get all nodes from Marzban to find the matching one
            marzban_nodes = await client.get_nodes()
            
            # Find node by name (case-insensitive)
            marzban_node = None
            for node in marzban_nodes:
                if node.get("name", "").lower() == node_name.lower():
                    marzban_node = node
                    break
            
            if not marzban_node:
                return False
            
            marzban_node_id = marzban_node.get("id")
            if not marzban_node_id:
                return False
            
            # Delete from Marzban
            await client.delete_node(marzban_node_id)
            return True
    
    async def _uninstall_from_server(self, ssh_profile_id: int, node_name: str) -> bool:
        """
        Uninstall node from server via SSH using marzban-node-manager CLI.
        
        Args:
            ssh_profile_id: SSH profile ID for credentials
            node_name: Node name to uninstall
            
        Returns:
            True if uninstalled successfully, False otherwise
        """
        # Get SSH credentials
        creds = self.ssh_profile_repo.get_decrypted_credentials(ssh_profile_id)
        if not creds:
            raise ValueError("SSH profile not found or has no credentials")
        
        # Create SSH client
        ssh_client = SSHClient(
            host=creds["host"],
            port=creds["port"],
            username=creds["username"],
            password=creds.get("password"),
            private_key=creds.get("private_key")
        )
        
        try:
            # Connect to server
            await ssh_client.connect()
            
            # Create node manager client
            node_manager = NodeManagerClient(ssh_client)
            
            # Uninstall the node
            success = await node_manager.uninstall_node(node_name)
            return success
            
        finally:
            await ssh_client.close()
    
    async def reconnect_node(
        self,
        node_id: int,
        client_ip: str = None
    ) -> Dict[str, Any]:
        """Reconnect node in Marzban."""
        node = self.node_repo.find_by_id_with_details(node_id)
        if not node:
            raise ValueError("Node not found")
        
        # Get Marzban client
        client = await self._get_client(node["MarzbanPanelID"])
        if not client:
            raise ValueError("Cannot connect to panel")
        
        async with client:
            # Note: Marzban reconnect requires Marzban node ID
            # For now, just update status
            pass
        
        self.node_repo.update_status(node_id, StatusEnum.CONNECTING)
        
        return {
            "id": node_id,
            "status": "connecting",
            "message": "Reconnection initiated"
        }
    
    async def get_node_status(self, node_id: int) -> Dict[str, Any]:
        """Get real-time node status from Marzban."""
        node = self.node_repo.find_by_id_with_details(node_id)
        if not node:
            raise ValueError("Node not found")
        
        return {
            "id": node_id,
            "status": StatusEnum.to_string(node["NodeStatusID"]),
            "xray_version": node.get("XrayVersion"),
            "uplink": node["Uplink"],
            "downlink": node["Downlink"],
            "message": node.get("StatusMessage")
        }
    
    async def get_node_templates(self, node_id: int) -> List[Dict[str, Any]]:
        """Get templates assigned to a node."""
        assignments = self.template_assignment_repo.find_by_node_id(node_id)
        return [
            {
                "id": a["ConfigurationTemplateID"],
                "tag": a["Tag"],
                "protocol": a["Protocol"],
                "transport": a["Transport"],
                "security": a["Security"],
                "port": a["Port"],
            }
            for a in assignments
        ]
    
    async def assign_templates(
        self,
        node_id: int,
        template_ids: List[int],
        client_ip: str = None
    ) -> List[Dict[str, Any]]:
        """Assign templates to a node."""
        node = self.node_repo.find_by_id(node_id)
        if not node:
            raise ValueError("Node not found")
        
        # Replace assignments
        self.template_assignment_repo.replace_assignments(node_id, template_ids)
        
        log_audit(
            self.db,
            entity_type="Node",
            entity_id=node_id,
            action_type="TEMPLATE_ASSIGN",
            description=f"Assigned {len(template_ids)} templates to node",
            new_value={"template_ids": template_ids},
            performed_by_ip=client_ip,
        )
        
        return await self.get_node_templates(node_id)
    
    async def get_ssh_install_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get SSH installation job status."""
        return _ssh_install_jobs.get(job_id)
    
    async def _get_client(self, panel_id: int) -> Optional[MarzbanClient]:
        """Get authenticated Marzban client for panel."""
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            return None
        
        cred = self.credential_repo.find_by_panel_id(panel_id)
        if not cred:
            return None
        
        if cred.get("AccessToken"):
            return MarzbanClient(
                panel_url=panel["PanelURL"],
                access_token=cred["AccessToken"]
            )
        
        password = cred.get("Password")
        if not password:
            return None
        
        return MarzbanClient(
            panel_url=panel["PanelURL"],
            username=cred["Username"],
            password=password
        )
