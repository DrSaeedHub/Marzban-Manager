"""
SSH Profile Repository.

Data access layer for SSHProfile table.
"""

from typing import Optional, List, Dict, Any

from app.repositories.base import BaseRepository
from app.db.connection import DatabaseConnection


class SSHProfileRepository(BaseRepository):
    """Repository for SSHProfile operations."""
    
    table_name = "SSHProfile"
    primary_key = "SSHProfileID"
    supports_soft_delete = True
    
    def find_all_safe(
        self,
        include_deleted: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all profiles without sensitive data.
        
        Returns:
            List of profile dictionaries without passwords/keys
        """
        query = '''
            SELECT 
                "SSHProfileID",
                "ProfileName",
                "Host",
                "Port",
                "Username",
                "UseKeyAuth",
                "Password" IS NOT NULL as has_password,
                "PrivateKey" IS NOT NULL as has_private_key,
                "DefaultServicePort",
                "DefaultAPIPort",
                "InstallDocker",
                "AutoStartNode",
                "CreatedDate",
                "UpdatedDate"
            FROM "SSHProfile"
        '''
        
        if not include_deleted:
            query += ' WHERE "IsDeleted" = FALSE'
        
        query += ' ORDER BY "ProfileName"'
        
        return self.db.fetch_all(query)
    
    def find_by_id_safe(
        self,
        profile_id: int,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get profile by ID without sensitive data.
        
        Args:
            profile_id: Profile ID
            include_deleted: Include soft-deleted records
            
        Returns:
            Profile dictionary without passwords/keys
        """
        query = '''
            SELECT 
                "SSHProfileID",
                "ProfileName",
                "Host",
                "Port",
                "Username",
                "UseKeyAuth",
                "Password" IS NOT NULL as has_password,
                "PrivateKey" IS NOT NULL as has_private_key,
                "DefaultServicePort",
                "DefaultAPIPort",
                "InstallDocker",
                "AutoStartNode",
                "CreatedDate",
                "UpdatedDate"
            FROM "SSHProfile"
            WHERE "SSHProfileID" = %s
        '''
        
        if not include_deleted:
            query += ' AND "IsDeleted" = FALSE'
        
        return self.db.fetch_one(query, (profile_id,))
    
    def find_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find profile by name (active only)."""
        return self.find_one({"ProfileName": name})
    
    def create_profile(
        self,
        profile_name: str,
        host: str,
        port: int,
        username: str,
        password: str = None,
        private_key: str = None,
        use_key_auth: bool = False,
        default_service_port: int = 62050,
        default_api_port: int = 62051,
        install_docker: bool = True,
        auto_start_node: bool = True
    ) -> Dict[str, Any]:
        """
        Create a new SSH profile.
        
        Args:
            profile_name: Display name
            host: SSH host
            port: SSH port
            username: SSH username
            password: SSH password (stored in plain text)
            private_key: SSH private key (stored in plain text)
            use_key_auth: Use key-based auth
            default_service_port: Default node service port
            default_api_port: Default node API port
            install_docker: Install Docker by default
            auto_start_node: Auto-start node after install
            
        Returns:
            Created profile record
        """
        data = {
            "ProfileName": profile_name,
            "Host": host,
            "Port": port,
            "Username": username,
            "UseKeyAuth": use_key_auth,
            "DefaultServicePort": default_service_port,
            "DefaultAPIPort": default_api_port,
            "InstallDocker": install_docker,
            "AutoStartNode": auto_start_node,
        }
        
        if password:
            data["Password"] = password
        
        if private_key:
            data["PrivateKey"] = private_key
        
        return self.insert(data)
    
    def update_password(self, profile_id: int, password: str) -> bool:
        """Update password for a profile."""
        result = self.update(profile_id, {"Password": password})
        return result is not None
    
    def update_private_key(self, profile_id: int, private_key: str) -> bool:
        """Update private key for a profile."""
        result = self.update(profile_id, {"PrivateKey": private_key})
        return result is not None
    
    def get_decrypted_credentials(
        self,
        profile_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get profile with credentials.
        
        Args:
            profile_id: Profile ID
            
        Returns:
            Profile with password and/or private_key
        """
        profile = self.find_by_id(profile_id)
        if not profile:
            return None
        
        return {
            "host": profile["Host"],
            "port": profile["Port"],
            "username": profile["Username"],
            "use_key_auth": profile["UseKeyAuth"],
            "password": profile.get("Password"),
            "private_key": profile.get("PrivateKey"),
        }
