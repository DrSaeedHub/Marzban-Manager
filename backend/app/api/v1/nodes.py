"""
Node Management Endpoints.

Handles operations on individual nodes.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.common import APIResponse
from app.schemas.node import (
    NodeUpdate,
    NodeResponse,
)
from app.services.node_service import NodeService
from app.core.dependencies import get_node_service

router = APIRouter()


@router.get("/{node_id}", response_model=APIResponse[NodeResponse])
async def get_node(
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Get node by ID."""
    result = await service.get_node(node_id)
    if not result:
        raise HTTPException(status_code=404, detail="Node not found")
    return APIResponse(success=True, data=result)


@router.put("/{node_id}", response_model=APIResponse[NodeResponse])
async def update_node(
    node_id: int,
    node: NodeUpdate,
    service: NodeService = Depends(get_node_service)
):
    """Update node details."""
    result = await service.update_node(node_id, node)
    if not result:
        raise HTTPException(status_code=404, detail="Node not found")
    return APIResponse(success=True, data=result)


@router.delete("/{node_id}", response_model=APIResponse[dict])
async def delete_node(
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Delete a node."""
    success = await service.delete_node(node_id)
    if not success:
        raise HTTPException(status_code=404, detail="Node not found")
    return APIResponse(success=True, data={"message": "Node deleted"})


@router.post("/{node_id}/reconnect", response_model=APIResponse[dict])
async def reconnect_node(
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Reconnect node in Marzban."""
    result = await service.reconnect_node(node_id)
    return APIResponse(success=True, data=result)


@router.get("/{node_id}/status", response_model=APIResponse[dict])
async def get_node_status(
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Get real-time node status from Marzban."""
    result = await service.get_node_status(node_id)
    return APIResponse(success=True, data=result)


@router.get("/{node_id}/templates", response_model=APIResponse[list])
async def get_node_templates(
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Get templates assigned to a node."""
    result = await service.get_node_templates(node_id)
    return APIResponse(success=True, data=result)


@router.put("/{node_id}/templates", response_model=APIResponse[list])
async def assign_node_templates(
    node_id: int,
    template_ids: List[int],
    service: NodeService = Depends(get_node_service)
):
    """Assign templates to a node."""
    result = await service.assign_templates(node_id, template_ids)
    return APIResponse(success=True, data=result)


# SSH Installation job endpoints
@router.get("/ssh-install/{job_id}", response_model=APIResponse[dict])
async def get_ssh_install_status(
    job_id: str,
    service: NodeService = Depends(get_node_service)
):
    """Get SSH installation job status."""
    result = await service.get_ssh_install_status(job_id)
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return APIResponse(success=True, data=result)
