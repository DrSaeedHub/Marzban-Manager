"""
Template Management Endpoints.

Handles CRUD operations for configuration templates.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.common import APIResponse
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse,
)
from app.services.template_service import TemplateService
from app.core.dependencies import get_template_service

router = APIRouter()


@router.get("", response_model=APIResponse[TemplateListResponse])
async def list_templates(
    protocol: str = None,
    transport: str = None,
    service: TemplateService = Depends(get_template_service)
):
    """List all templates with optional filters."""
    templates = await service.list_templates(protocol=protocol, transport=transport)
    return APIResponse(success=True, data=TemplateListResponse(templates=templates))


@router.post("", response_model=APIResponse[TemplateResponse], status_code=status.HTTP_201_CREATED)
async def create_template(
    template: TemplateCreate,
    service: TemplateService = Depends(get_template_service)
):
    """Create a new template."""
    result = await service.create_template(template)
    return APIResponse(success=True, data=result)


@router.get("/{template_id}", response_model=APIResponse[TemplateResponse])
async def get_template(
    template_id: int,
    service: TemplateService = Depends(get_template_service)
):
    """Get template by ID."""
    result = await service.get_template(template_id)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return APIResponse(success=True, data=result)


@router.put("/{template_id}", response_model=APIResponse[TemplateResponse])
async def update_template(
    template_id: int,
    template: TemplateUpdate,
    service: TemplateService = Depends(get_template_service)
):
    """Update template details."""
    result = await service.update_template(template_id, template)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return APIResponse(success=True, data=result)


@router.delete("/{template_id}", response_model=APIResponse[dict])
async def delete_template(
    template_id: int,
    service: TemplateService = Depends(get_template_service)
):
    """Soft delete a template."""
    success = await service.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return APIResponse(success=True, data={"message": "Template deleted"})


@router.post("/{template_id}/duplicate", response_model=APIResponse[TemplateResponse], status_code=status.HTTP_201_CREATED)
async def duplicate_template(
    template_id: int,
    new_tag: str = None,
    service: TemplateService = Depends(get_template_service)
):
    """Duplicate a template."""
    result = await service.duplicate_template(template_id, new_tag)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return APIResponse(success=True, data=result)
