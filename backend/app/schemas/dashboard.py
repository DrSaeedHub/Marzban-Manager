"""
Dashboard Schema Definitions.

Models for dashboard statistics and metrics.
"""

from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    total_panels: int = Field(..., description="Total number of panels")
    total_nodes: int = Field(..., description="Total number of nodes")
    connected_nodes: int = Field(..., description="Number of connected nodes")
    total_templates: int = Field(..., description="Total number of templates")
