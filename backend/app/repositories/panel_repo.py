"""
Panel Repository.

Data access layer for MarzbanPanel and PanelCredential tables.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime

from app.repositories.base import BaseRepository
from app.db.connection import DatabaseConnection
from app.schemas.common import StatusEnum


class PanelRepository(BaseRepository):
    """Repository for MarzbanPanel operations."""

    table_name = "MarzbanPanel"
    primary_key = "MarzbanPanelID"
    supports_soft_delete = True

    def find_all_with_node_count(
        self,
        include_deleted: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all panels with their node counts.

        Returns:
            List of panel dictionaries with node_count field
        """
        query = '''
            SELECT 
                p.*,
                c."Username",
                c."Password",
                COALESCE(node_counts.node_count, 0) as node_count
            FROM "MarzbanPanel" p
            LEFT JOIN "PanelCredential" c ON p."MarzbanPanelID" = c."MarzbanPanelID"
            LEFT JOIN (
                SELECT "MarzbanPanelID", COUNT(*) as node_count
                FROM "Node"
                WHERE "IsDeleted" = FALSE
                GROUP BY "MarzbanPanelID"
            ) node_counts ON p."MarzbanPanelID" = node_counts."MarzbanPanelID"
        '''

        if not include_deleted:
            query += ' WHERE p."IsDeleted" = FALSE'

        query += ' ORDER BY p."PanelName"'

        return self.db.fetch_all(query)

    def find_by_id_with_details(
        self,
        panel_id: int,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get panel by ID with credentials and node count.

        Args:
            panel_id: Panel ID
            include_deleted: Include soft-deleted records

        Returns:
            Panel dictionary with credentials and node count
        """
        query = '''
            SELECT 
                p.*,
                c."Username",
                c."Password",
                c."AccessToken",
                c."TokenExpiryDate",
                COALESCE(node_counts.node_count, 0) as node_count
            FROM "MarzbanPanel" p
            LEFT JOIN "PanelCredential" c ON p."MarzbanPanelID" = c."MarzbanPanelID"
            LEFT JOIN (
                SELECT "MarzbanPanelID", COUNT(*) as node_count
                FROM "Node"
                WHERE "IsDeleted" = FALSE
                GROUP BY "MarzbanPanelID"
            ) node_counts ON p."MarzbanPanelID" = node_counts."MarzbanPanelID"
            WHERE p."MarzbanPanelID" = %s
        '''

        if not include_deleted:
            query += ' AND p."IsDeleted" = FALSE'

        return self.db.fetch_one(query, (panel_id,))

    def find_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find panel by name (active only)."""
        return self.find_one({"PanelName": name})

    def find_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Find panel by URL (active only)."""
        return self.find_one({"PanelURL": url})

    def update_status(
        self,
        panel_id: int,
        status_id: int,
        message: str = None
    ) -> bool:
        """
        Update panel connection status.

        Args:
            panel_id: Panel ID
            status_id: Status ID from StatusEnum
            message: Optional status message

        Returns:
            True if updated
        """
        data = {
            "PanelStatusID": status_id,
            "StatusMessage": message,
        }

        if status_id == StatusEnum.CONNECTED:
            data["LastSyncDate"] = datetime.utcnow()

        result = self.update(panel_id, data)
        return result is not None

    def update_certificate(self, panel_id: int, certificate: str) -> bool:
        """Update panel certificate."""
        result = self.update(panel_id, {"Certificate": certificate})
        return result is not None


class PanelCredentialRepository(BaseRepository):
    """Repository for PanelCredential operations."""

    table_name = "PanelCredential"
    primary_key = "PanelCredentialID"
    supports_soft_delete = False

    def find_by_panel_id(self, panel_id: int) -> Optional[Dict[str, Any]]:
        """Get credentials for a panel."""
        return self.find_one({"MarzbanPanelID": panel_id})

    def create_for_panel(
        self,
        panel_id: int,
        username: str,
        password: str
    ) -> Dict[str, Any]:
        """
        Create credentials for a panel.

        Args:
            panel_id: Panel ID
            username: Admin username
            password: Admin password (stored in plain text)

        Returns:
            Created credential record
        """
        return self.insert({
            "MarzbanPanelID": panel_id,
            "Username": username,
            "Password": password,
        })

    def update_password(self, panel_id: int, password: str) -> bool:
        """Update password for a panel."""
        return self.update_where(
            {"MarzbanPanelID": panel_id},
            {"Password": password}
        ) > 0

    def update_token(
        self,
        panel_id: int,
        access_token: str,
        expiry_date: datetime = None
    ) -> bool:
        """Update access token for a panel."""
        return self.update_where(
            {"MarzbanPanelID": panel_id},
            {
                "AccessToken": access_token,
                "TokenExpiryDate": expiry_date,
            }
        ) > 0

    def get_decrypted_password(self, panel_id: int) -> Optional[str]:
        """
        Get password for a panel.

        Args:
            panel_id: Panel ID

        Returns:
            Password or None
        """
        cred = self.find_by_panel_id(panel_id)
        if not cred or not cred.get("Password"):
            return None

        return cred["Password"]

    def delete_for_panel(self, panel_id: int) -> bool:
        """Delete credentials for a panel."""
        return self.delete_where({"MarzbanPanelID": panel_id}, hard=True) > 0
