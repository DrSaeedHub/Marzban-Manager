"""
Settings Service.

Business logic for application settings management.
"""

import logging
from typing import Optional, Dict, Any

from app.db.connection import DatabaseConnection
from app.repositories.settings_repo import SettingsRepository
from app.repositories.audit_repo import log_audit

logger = logging.getLogger(__name__)


class SettingsService:
    """Service for application settings management."""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.settings_repo = SettingsRepository(db)
    
    async def get_all_settings(self) -> Dict[str, str]:
        """Get all application settings."""
        return self.settings_repo.get_all_settings()
    
    async def get_setting(self, key: str) -> Optional[str]:
        """Get a specific setting value."""
        return self.settings_repo.get_setting(key)
    
    async def update_setting(
        self,
        key: str,
        value: str,
        client_ip: str = None
    ) -> Dict[str, Any]:
        """Update a setting value."""
        old_value = self.settings_repo.get_setting(key)
        
        result = self.settings_repo.set_setting(key, value)
        
        log_audit(
            self.db,
            entity_type="AppSetting",
            entity_id=0,  # Settings don't have numeric IDs
            action_type="UPDATE",
            description=f"Updated setting '{key}'",
            old_value={"key": key, "value": old_value},
            new_value={"key": key, "value": value},
            performed_by_ip=client_ip,
        )
        
        logger.info(f"Updated setting: {key}")
        
        return {
            "key": result["SettingKey"],
            "value": result["SettingValue"],
            "description": result.get("SettingDescription"),
            "updated_at": result["UpdatedDate"].isoformat(),
        }
