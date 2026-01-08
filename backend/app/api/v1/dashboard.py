"""
Dashboard Endpoints.

Provides dashboard statistics and metrics.
"""

from fastapi import APIRouter, Depends

from app.schemas.common import APIResponse
from app.schemas.dashboard import DashboardStats
from app.services.dashboard_service import DashboardService
from app.core.dependencies import get_dashboard_service

router = APIRouter()


@router.get("/stats", response_model=APIResponse[DashboardStats])
async def get_dashboard_stats(
    service: DashboardService = Depends(get_dashboard_service)
):
    """
    Get dashboard statistics.
    
    Returns:
        Dashboard stats including panel, node, and template counts.
    """
    stats = await service.get_stats()
    return APIResponse(success=True, data=stats)
