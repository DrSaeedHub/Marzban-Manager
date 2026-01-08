"""
Health Check Endpoints.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy"}


@router.get("/ready")
async def readiness_check():
    """Readiness probe - checks if app is ready to serve traffic."""
    # TODO: Add database connectivity check
    return {"status": "ready"}
