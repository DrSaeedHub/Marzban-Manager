"""
FastAPI Dependencies.

Dependency injection for services, database connections, etc.
"""

from typing import Generator

from fastapi import Depends, Request

from app.db.connection import DatabaseConnection
from app.services.panel_service import PanelService
from app.services.node_service import NodeService
from app.services.template_service import TemplateService
from app.services.ssh_profile_service import SSHProfileService
from app.services.settings_service import SettingsService
from app.services.ssh_install_service import SSHInstallService
from app.services.dashboard_service import DashboardService


def get_db() -> Generator[DatabaseConnection, None, None]:
    """
    Get database connection dependency.
    
    Yields:
        DatabaseConnection instance
    """
    with DatabaseConnection() as db:
        yield db


def get_client_ip(request: Request) -> str:
    """
    Get client IP from request.
    
    Handles X-Forwarded-For header for reverse proxy setups.
    
    Returns:
        Client IP address
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def get_panel_service(
    db: DatabaseConnection = Depends(get_db)
) -> PanelService:
    """Get PanelService instance."""
    return PanelService(db)


def get_node_service(
    db: DatabaseConnection = Depends(get_db)
) -> NodeService:
    """Get NodeService instance."""
    return NodeService(db)


def get_template_service(
    db: DatabaseConnection = Depends(get_db)
) -> TemplateService:
    """Get TemplateService instance."""
    return TemplateService(db)


def get_ssh_profile_service(
    db: DatabaseConnection = Depends(get_db)
) -> SSHProfileService:
    """Get SSHProfileService instance."""
    return SSHProfileService(db)


def get_settings_service(
    db: DatabaseConnection = Depends(get_db)
) -> SettingsService:
    """Get SettingsService instance."""
    return SettingsService(db)


def get_ssh_install_service(
    db: DatabaseConnection = Depends(get_db)
) -> SSHInstallService:
    """Get SSHInstallService instance."""
    return SSHInstallService(db)


def get_dashboard_service(
    db: DatabaseConnection = Depends(get_db)
) -> DashboardService:
    """Get DashboardService instance."""
    return DashboardService(db)
