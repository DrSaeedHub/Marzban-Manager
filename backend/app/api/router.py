"""
Main API Router - Aggregates all routes.
"""

from fastapi import APIRouter

from app.api.v1 import panels, nodes, templates, ssh_profiles, settings, health, dashboard, ssh_install

# Create main API router
api_router = APIRouter()

# Include routers with prefixes
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"]
)

api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"]
)

api_router.include_router(
    panels.router,
    prefix="/panels",
    tags=["Panels"]
)

api_router.include_router(
    nodes.router,
    prefix="/nodes",
    tags=["Nodes"]
)

api_router.include_router(
    templates.router,
    prefix="/templates",
    tags=["Templates"]
)

api_router.include_router(
    ssh_profiles.router,
    prefix="/ssh-profiles",
    tags=["SSH Profiles"]
)

api_router.include_router(
    settings.router,
    prefix="/settings",
    tags=["Settings"]
)

api_router.include_router(
    ssh_install.router,
    prefix="/ssh-install",
    tags=["SSH Installation"]
)
