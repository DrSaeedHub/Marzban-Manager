"""
Application Settings Endpoints.

Handles app-level configuration settings.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.common import APIResponse
from app.services.settings_service import SettingsService
from app.core.dependencies import get_settings_service

router = APIRouter()


@router.get("", response_model=APIResponse[dict])
async def get_all_settings(
    service: SettingsService = Depends(get_settings_service)
):
    """Get all application settings."""
    settings = await service.get_all_settings()
    return APIResponse(success=True, data=settings)


@router.get("/{key}", response_model=APIResponse[dict])
async def get_setting(
    key: str,
    service: SettingsService = Depends(get_settings_service)
):
    """Get a specific setting by key."""
    value = await service.get_setting(key)
    if value is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return APIResponse(success=True, data={"key": key, "value": value})


@router.put("/{key}", response_model=APIResponse[dict])
async def update_setting(
    key: str,
    value: str,
    service: SettingsService = Depends(get_settings_service)
):
    """Update a setting value."""
    result = await service.update_setting(key, value)
    return APIResponse(success=True, data=result)
