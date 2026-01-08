"""
SSH Profile Management Endpoints.

Handles CRUD operations for reusable SSH profiles.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.common import APIResponse
from app.schemas.ssh_profile import (
    SSHProfileCreate,
    SSHProfileUpdate,
    SSHProfileResponse,
    SSHProfileListResponse,
)
from app.services.ssh_profile_service import SSHProfileService
from app.core.dependencies import get_ssh_profile_service

router = APIRouter()


@router.get("", response_model=APIResponse[SSHProfileListResponse])
async def list_ssh_profiles(
    service: SSHProfileService = Depends(get_ssh_profile_service)
):
    """List all SSH profiles."""
    profiles = await service.list_profiles()
    return APIResponse(success=True, data=SSHProfileListResponse(profiles=profiles))


@router.post("", response_model=APIResponse[SSHProfileResponse], status_code=status.HTTP_201_CREATED)
async def create_ssh_profile(
    profile: SSHProfileCreate,
    service: SSHProfileService = Depends(get_ssh_profile_service)
):
    """Create a new SSH profile."""
    result = await service.create_profile(profile)
    return APIResponse(success=True, data=result)


@router.get("/{profile_id}", response_model=APIResponse[SSHProfileResponse])
async def get_ssh_profile(
    profile_id: int,
    service: SSHProfileService = Depends(get_ssh_profile_service)
):
    """Get SSH profile by ID."""
    result = await service.get_profile(profile_id)
    if not result:
        raise HTTPException(status_code=404, detail="SSH profile not found")
    return APIResponse(success=True, data=result)


@router.put("/{profile_id}", response_model=APIResponse[SSHProfileResponse])
async def update_ssh_profile(
    profile_id: int,
    profile: SSHProfileUpdate,
    service: SSHProfileService = Depends(get_ssh_profile_service)
):
    """Update SSH profile details."""
    result = await service.update_profile(profile_id, profile)
    if not result:
        raise HTTPException(status_code=404, detail="SSH profile not found")
    return APIResponse(success=True, data=result)


@router.delete("/{profile_id}", response_model=APIResponse[dict])
async def delete_ssh_profile(
    profile_id: int,
    service: SSHProfileService = Depends(get_ssh_profile_service)
):
    """Delete an SSH profile."""
    success = await service.delete_profile(profile_id)
    if not success:
        raise HTTPException(status_code=404, detail="SSH profile not found")
    return APIResponse(success=True, data={"message": "SSH profile deleted"})


@router.post("/{profile_id}/test", response_model=APIResponse[dict])
async def test_ssh_connection(
    profile_id: int,
    service: SSHProfileService = Depends(get_ssh_profile_service)
):
    """Test SSH connection using profile credentials."""
    result = await service.test_connection(profile_id)
    return APIResponse(success=True, data=result)
