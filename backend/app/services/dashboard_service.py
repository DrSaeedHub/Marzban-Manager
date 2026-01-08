"""
Dashboard Service.

Business logic for dashboard statistics.
"""

import logging
from typing import Dict, Any

from app.db.connection import DatabaseConnection
from app.schemas.common import StatusEnum
from app.schemas.dashboard import DashboardStats

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for dashboard operations."""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    async def get_stats(self) -> DashboardStats:
        """
        Get dashboard statistics.

        Returns:
            DashboardStats with counts of panels, nodes, and templates
        """
        # Get total panels (non-deleted)
        result = self.db.fetch_one("""
            SELECT COUNT(*) as count
            FROM "MarzbanPanel"
            WHERE "IsDeleted" = FALSE
        """)
        total_panels = result["count"] if result else 0

        # Get total nodes (non-deleted)
        result = self.db.fetch_one("""
            SELECT COUNT(*) as count
            FROM "Node"
            WHERE "IsDeleted" = FALSE
        """)
        total_nodes = result["count"] if result else 0

        # Get connected nodes
        result = self.db.fetch_one("""
            SELECT COUNT(*) as count
            FROM "Node"
            WHERE "IsDeleted" = FALSE
            AND "NodeStatusID" = %s
        """, (StatusEnum.CONNECTED,))
        connected_nodes = result["count"] if result else 0

        # Get total templates (non-deleted)
        result = self.db.fetch_one("""
            SELECT COUNT(*) as count
            FROM "ConfigurationTemplate"
            WHERE "IsDeleted" = FALSE
        """)
        total_templates = result["count"] if result else 0

        return DashboardStats(
            total_panels=total_panels,
            total_nodes=total_nodes,
            connected_nodes=connected_nodes,
            total_templates=total_templates
        )
