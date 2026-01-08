"""
Settings Repository.

Data access layer for AppSetting table.
"""

from typing import Optional, List, Dict, Any

from app.repositories.base import BaseRepository
from app.db.connection import DatabaseConnection


class SettingsRepository(BaseRepository):
    """Repository for AppSetting operations."""
    
    table_name = "AppSetting"
    primary_key = "SettingKey"
    supports_soft_delete = False
    
    def get_all_settings(self) -> Dict[str, str]:
        """
        Get all settings as a dictionary.
        
        Returns:
            Dictionary of setting key-value pairs
        """
        records = self.find_all()
        return {r["SettingKey"]: r["SettingValue"] for r in records}
    
    def get_setting(self, key: str) -> Optional[str]:
        """
        Get a single setting value.
        
        Args:
            key: Setting key
            
        Returns:
            Setting value or None
        """
        record = self.find_one({"SettingKey": key})
        return record["SettingValue"] if record else None
    
    def get_setting_int(self, key: str, default: int = 0) -> int:
        """Get setting as integer."""
        value = self.get_setting(key)
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            return default
    
    def get_setting_float(self, key: str, default: float = 0.0) -> float:
        """Get setting as float."""
        value = self.get_setting(key)
        if value is None:
            return default
        try:
            return float(value)
        except ValueError:
            return default
    
    def get_setting_bool(self, key: str, default: bool = False) -> bool:
        """Get setting as boolean."""
        value = self.get_setting(key)
        if value is None:
            return default
        return value.lower() in ("true", "1", "yes", "on")
    
    def set_setting(
        self,
        key: str,
        value: str,
        description: str = None
    ) -> Dict[str, Any]:
        """
        Set or update a setting.
        
        Args:
            key: Setting key
            value: Setting value
            description: Optional description
            
        Returns:
            Updated setting record
        """
        # Use upsert pattern
        query = '''
            INSERT INTO "AppSetting" ("SettingKey", "SettingValue", "SettingDescription", "UpdatedDate")
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT ("SettingKey") DO UPDATE SET
                "SettingValue" = EXCLUDED."SettingValue",
                "SettingDescription" = COALESCE(EXCLUDED."SettingDescription", "AppSetting"."SettingDescription"),
                "UpdatedDate" = NOW()
            RETURNING *
        '''
        
        self.db.cursor.execute(query, (key, value, description))
        return dict(self.db.cursor.fetchone())
    
    def delete_setting(self, key: str) -> bool:
        """
        Delete a setting.
        
        Args:
            key: Setting key
            
        Returns:
            True if deleted
        """
        query = 'DELETE FROM "AppSetting" WHERE "SettingKey" = %s'
        self.db.cursor.execute(query, (key,))
        return self.db.cursor.rowcount > 0
