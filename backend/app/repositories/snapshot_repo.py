"""
Config Snapshot Repository.

Data access layer for PanelConfigSnapshot table.
"""

from typing import Optional, List, Dict, Any
import json

from app.repositories.base import BaseRepository
from app.db.connection import DatabaseConnection


class SnapshotRepository(BaseRepository):
    """Repository for PanelConfigSnapshot operations."""
    
    table_name = "PanelConfigSnapshot"
    primary_key = "PanelConfigSnapshotID"
    supports_soft_delete = False
    
    def find_by_panel_id(
        self,
        panel_id: int,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get config snapshots for a panel.
        
        Args:
            panel_id: Panel ID
            limit: Maximum snapshots to return
            
        Returns:
            List of snapshot records (newest first)
        """
        return self.find_all(
            where={"MarzbanPanelID": panel_id},
            order_by='"CreatedDate" DESC',
            limit=limit
        )
    
    def create_snapshot(
        self,
        panel_id: int,
        config: dict,
        reason: str = None,
        created_by_user_id: int = None
    ) -> Dict[str, Any]:
        """
        Create a new config snapshot.
        
        Args:
            panel_id: Panel ID
            config: Configuration JSON
            reason: Reason for snapshot
            created_by_user_id: User who created snapshot
            
        Returns:
            Created snapshot record
        """
        return self.insert({
            "MarzbanPanelID": panel_id,
            "ConfigJSON": json.dumps(config),
            "SnapshotReason": reason,
            "CreatedByUserID": created_by_user_id,
        })
    
    def get_latest(self, panel_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the most recent snapshot for a panel.
        
        Args:
            panel_id: Panel ID
            
        Returns:
            Latest snapshot or None
        """
        snapshots = self.find_by_panel_id(panel_id, limit=1)
        return snapshots[0] if snapshots else None
    
    def delete_old_snapshots(
        self,
        panel_id: int,
        keep_count: int = 20
    ) -> int:
        """
        Delete old snapshots, keeping only the most recent.
        
        Args:
            panel_id: Panel ID
            keep_count: Number of snapshots to keep
            
        Returns:
            Number of deleted snapshots
        """
        query = '''
            DELETE FROM "PanelConfigSnapshot"
            WHERE "PanelConfigSnapshotID" IN (
                SELECT "PanelConfigSnapshotID"
                FROM "PanelConfigSnapshot"
                WHERE "MarzbanPanelID" = %s
                ORDER BY "CreatedDate" DESC
                OFFSET %s
            )
        '''
        
        self.db.cursor.execute(query, (panel_id, keep_count))
        return self.db.cursor.rowcount
