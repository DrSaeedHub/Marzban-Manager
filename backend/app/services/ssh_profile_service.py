"""
SSH Profile Service.

Business logic for SSH profile management.
"""

import logging
from typing import Optional, List, Dict, Any

from app.db.connection import DatabaseConnection
from app.repositories.ssh_profile_repo import SSHProfileRepository
from app.repositories.audit_repo import log_audit
from app.clients.ssh_client import SSHClient
from app.schemas.ssh_profile import (
    SSHProfileCreate,
    SSHProfileUpdate,
    SSHProfileResponse,
    SSHConnectionTestResponse,
)

logger = logging.getLogger(__name__)


class SSHProfileService:
    """Service for SSH profile management operations."""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.profile_repo = SSHProfileRepository(db)
    
    def _to_response(self, profile: Dict[str, Any]) -> SSHProfileResponse:
        """Convert database record to response model."""
        return SSHProfileResponse(
            id=profile["SSHProfileID"],
            profile_name=profile["ProfileName"],
            host=profile["Host"],
            port=profile["Port"],
            username=profile["Username"],
            use_key_auth=profile["UseKeyAuth"],
            has_password=profile.get("has_password", False),
            has_private_key=profile.get("has_private_key", False),
            default_service_port=profile["DefaultServicePort"],
            default_api_port=profile["DefaultAPIPort"],
            install_docker=profile["InstallDocker"],
            auto_start_node=profile["AutoStartNode"],
            created_at=profile["CreatedDate"],
            updated_at=profile.get("UpdatedDate"),
        )
    
    async def list_profiles(self) -> List[SSHProfileResponse]:
        """List all SSH profiles (without sensitive data)."""
        profiles = self.profile_repo.find_all_safe()
        return [self._to_response(p) for p in profiles]
    
    async def get_profile(self, profile_id: int) -> Optional[SSHProfileResponse]:
        """Get SSH profile by ID (without sensitive data)."""
        profile = self.profile_repo.find_by_id_safe(profile_id)
        if not profile:
            return None
        return self._to_response(profile)
    
    async def create_profile(
        self,
        data: SSHProfileCreate,
        client_ip: str = None
    ) -> SSHProfileResponse:
        """Create a new SSH profile."""
        # Check for duplicate name
        if self.profile_repo.find_by_name(data.profile_name):
            raise ValueError(f"Profile with name '{data.profile_name}' already exists")
        
        # Validate auth
        if not data.password and not data.private_key:
            raise ValueError("Either password or private key is required")
        
        profile = self.profile_repo.create_profile(
            profile_name=data.profile_name,
            host=data.host,
            port=data.port,
            username=data.username,
            password=data.password,
            private_key=data.private_key,
            use_key_auth=data.use_key_auth,
            default_service_port=data.default_service_port,
            default_api_port=data.default_api_port,
            install_docker=data.install_docker,
            auto_start_node=data.auto_start_node,
        )
        
        log_audit(
            self.db,
            entity_type="SSHProfile",
            entity_id=profile["SSHProfileID"],
            action_type="CREATE",
            description=f"Created SSH profile '{data.profile_name}'",
            new_value={"name": data.profile_name, "host": data.host},
            performed_by_ip=client_ip,
        )
        
        logger.info(f"Created SSH profile: {data.profile_name} ({profile['SSHProfileID']})")
        
        return await self.get_profile(profile["SSHProfileID"])
    
    async def update_profile(
        self,
        profile_id: int,
        data: SSHProfileUpdate,
        client_ip: str = None
    ) -> Optional[SSHProfileResponse]:
        """Update SSH profile details."""
        existing = self.profile_repo.find_by_id(profile_id)
        if not existing:
            return None
        
        # Build update data
        update_data = {}
        if data.profile_name is not None and data.profile_name != existing["ProfileName"]:
            if self.profile_repo.find_by_name(data.profile_name):
                raise ValueError(f"Profile with name '{data.profile_name}' already exists")
            update_data["ProfileName"] = data.profile_name
        
        if data.host is not None:
            update_data["Host"] = data.host
        if data.port is not None:
            update_data["Port"] = data.port
        if data.username is not None:
            update_data["Username"] = data.username
        if data.use_key_auth is not None:
            update_data["UseKeyAuth"] = data.use_key_auth
        if data.default_service_port is not None:
            update_data["DefaultServicePort"] = data.default_service_port
        if data.default_api_port is not None:
            update_data["DefaultAPIPort"] = data.default_api_port
        if data.install_docker is not None:
            update_data["InstallDocker"] = data.install_docker
        if data.auto_start_node is not None:
            update_data["AutoStartNode"] = data.auto_start_node
        
        if update_data:
            self.profile_repo.update(profile_id, update_data)
        
        # Handle password update separately
        if data.password:
            self.profile_repo.update_password(profile_id, data.password)
        
        # Handle private key update separately
        if data.private_key:
            self.profile_repo.update_private_key(profile_id, data.private_key)
        
        if update_data or data.password or data.private_key:
            log_audit(
                self.db,
                entity_type="SSHProfile",
                entity_id=profile_id,
                action_type="UPDATE",
                description=f"Updated SSH profile '{existing['ProfileName']}'",
                old_value={"name": existing["ProfileName"]},
                performed_by_ip=client_ip,
            )
            
            logger.info(f"Updated SSH profile: {profile_id}")
        
        return await self.get_profile(profile_id)
    
    async def delete_profile(
        self,
        profile_id: int,
        client_ip: str = None
    ) -> bool:
        """Delete an SSH profile."""
        existing = self.profile_repo.find_by_id(profile_id)
        if not existing:
            return False
        
        success = self.profile_repo.delete(profile_id)
        
        if success:
            log_audit(
                self.db,
                entity_type="SSHProfile",
                entity_id=profile_id,
                action_type="DELETE",
                description=f"Deleted SSH profile '{existing['ProfileName']}'",
                old_value={"name": existing["ProfileName"]},
                performed_by_ip=client_ip,
            )
            logger.info(f"Deleted SSH profile: {profile_id}")
        
        return success
    
    async def test_connection(
        self,
        profile_id: int
    ) -> SSHConnectionTestResponse:
        """Test SSH connection using profile credentials."""
        creds = self.profile_repo.get_decrypted_credentials(profile_id)
        if not creds:
            return SSHConnectionTestResponse(
                connected=False,
                error="Profile not found or no credentials"
            )
        
        try:
            ssh = SSHClient(
                host=creds["host"],
                port=creds["port"],
                username=creds["username"],
                password=creds["password"],
                private_key=creds["private_key"],
            )
            
            success, error = await ssh.test_connection()
            
            if success:
                # Get server info
                return SSHConnectionTestResponse(
                    connected=True,
                    server_info=f"{creds['host']}:{creds['port']}"
                )
            else:
                return SSHConnectionTestResponse(
                    connected=False,
                    error=error
                )
                
        except Exception as e:
            return SSHConnectionTestResponse(
                connected=False,
                error=str(e)
            )
