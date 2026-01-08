"""
Panel Management Endpoints.

Handles CRUD operations for Marzban panels and their connections.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body

from app.schemas.common import APIResponse
from app.schemas.panel import (
    PanelCreate,
    PanelUpdate,
    PanelResponse,
    PanelListResponse,
    ConnectionTestResponse,
    CertificateResponse,
    TestConnectionRequest,
    UpdateCredentialsRequest,
    DisconnectResponse,
    RestartXrayCoreResponse,
)
from app.schemas.node import (
    NodeUpdate,
    NodeResponse,
    AssignTemplatesRequest,
    NodeDeleteOptions,
    NodeDeleteResponse,
)
from app.services.panel_service import PanelService
from app.services.node_service import NodeService
from app.core.dependencies import get_panel_service, get_node_service

router = APIRouter()


@router.get("", response_model=APIResponse[PanelListResponse])
async def list_panels(
    service: PanelService = Depends(get_panel_service)
):
    """List all panels."""
    panels = await service.list_panels()
    return APIResponse(success=True, data=PanelListResponse(panels=panels))


@router.post("", response_model=APIResponse[PanelResponse], status_code=status.HTTP_201_CREATED)
async def create_panel(
    panel: PanelCreate,
    service: PanelService = Depends(get_panel_service)
):
    """Create a new panel."""
    result = await service.create_panel(panel)
    return APIResponse(success=True, data=result)


@router.get("/{panel_id}", response_model=APIResponse[PanelResponse])
async def get_panel(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Get panel by ID."""
    result = await service.get_panel(panel_id)
    if not result:
        raise HTTPException(status_code=404, detail="Panel not found")
    return APIResponse(success=True, data=result)


@router.put("/{panel_id}", response_model=APIResponse[PanelResponse])
async def update_panel(
    panel_id: int,
    panel: PanelUpdate,
    service: PanelService = Depends(get_panel_service)
):
    """Update panel details."""
    result = await service.update_panel(panel_id, panel)
    if not result:
        raise HTTPException(status_code=404, detail="Panel not found")
    return APIResponse(success=True, data=result)


@router.delete("/{panel_id}", response_model=APIResponse[dict])
async def delete_panel(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Soft delete a panel."""
    success = await service.delete_panel(panel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Panel not found")
    return APIResponse(success=True, data={"message": "Panel deleted"})


@router.post("/test", response_model=APIResponse[ConnectionTestResponse])
async def test_panel_connection(
    request: TestConnectionRequest,
    service: PanelService = Depends(get_panel_service)
):
    """Test connection to a Marzban panel (no panel ID required)."""
    result = await service.test_connection_anonymous(
        url=request.url,
        username=request.username,
        password=request.password
    )
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/connect", response_model=APIResponse[ConnectionTestResponse])
async def test_connection(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Test connection to panel and authenticate."""
    result = await service.test_connection(panel_id)
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/reconnect", response_model=APIResponse[ConnectionTestResponse])
async def reconnect_panel(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Re-authenticate and refresh token."""
    result = await service.reconnect(panel_id)
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/disconnect", response_model=APIResponse[DisconnectResponse])
async def disconnect_panel(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Disconnect from panel (clear token, set status to disabled)."""
    try:
        result = await service.disconnect(panel_id)
        return APIResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{panel_id}/credentials", response_model=APIResponse[ConnectionTestResponse])
async def update_credentials(
    panel_id: int,
    request: UpdateCredentialsRequest,
    service: PanelService = Depends(get_panel_service)
):
    """Update panel credentials and reconnect."""
    try:
        result = await service.update_credentials(panel_id, request)
        return APIResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{panel_id}/certificate", response_model=APIResponse[CertificateResponse])
async def get_certificate(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Fetch node certificate from Marzban panel."""
    result = await service.get_certificate(panel_id)
    return APIResponse(success=True, data=result)


# Xray Config endpoints
@router.get("/{panel_id}/xray-config", response_model=APIResponse[dict])
async def get_xray_config(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Get current Xray configuration from panel."""
    result = await service.get_xray_config(panel_id)
    return APIResponse(success=True, data=result)


@router.put("/{panel_id}/xray-config", response_model=APIResponse[dict])
async def update_xray_config(
    panel_id: int,
    config: dict,
    snapshot_reason: Optional[str] = None,
    service: PanelService = Depends(get_panel_service)
):
    """Update Xray configuration on panel."""
    result = await service.update_xray_config(panel_id, config, snapshot_reason)
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/xray-restart", response_model=APIResponse[RestartXrayCoreResponse])
async def restart_xray_core(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Restart Xray core on the panel (proxies to Marzban POST /api/core/restart)."""
    try:
        result = await service.restart_xray_core(panel_id)
        return APIResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{panel_id}/xray-config/snapshots", response_model=APIResponse[list])
async def list_config_snapshots(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """List configuration snapshots for panel."""
    result = await service.list_config_snapshots(panel_id)
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/xray-config/restore/{snapshot_id}", response_model=APIResponse[dict])
async def restore_config_snapshot(
    panel_id: int,
    snapshot_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """Restore configuration from snapshot."""
    result = await service.restore_config_snapshot(panel_id, snapshot_id)
    return APIResponse(success=True, data=result)


# Panel Nodes (nested under panel)
@router.get("/{panel_id}/nodes", response_model=APIResponse[list])
async def list_panel_nodes(
    panel_id: int,
    sync: bool = True,
    service: PanelService = Depends(get_panel_service)
):
    """
    List nodes for a specific panel.
    
    Args:
        panel_id: Panel ID
        sync: If true (default), sync statuses from Marzban panel first
    """
    result = await service.list_panel_nodes(panel_id, sync_status=sync)
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/nodes/sync", response_model=APIResponse[dict])
async def sync_panel_nodes(
    panel_id: int,
    service: PanelService = Depends(get_panel_service)
):
    """
    Manually sync node statuses from Marzban panel.
    
    Fetches current node statuses from the Marzban panel API
    and updates the local database.
    """
    result = await service.sync_node_statuses(panel_id)
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/nodes", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_panel_node(
    panel_id: int,
    node: dict,
    service: PanelService = Depends(get_panel_service)
):
    """Register a new node in the panel."""
    result = await service.create_node(panel_id, node)
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/nodes/ssh-install", response_model=APIResponse[dict], status_code=status.HTTP_202_ACCEPTED)
async def ssh_install_node(
    panel_id: int,
    install_request: dict,
    service: PanelService = Depends(get_panel_service)
):
    """Start SSH installation of a node."""
    result = await service.start_ssh_install(panel_id, install_request)
    return APIResponse(success=True, data=result)


# Individual node operations (nested under panel)
@router.get("/{panel_id}/nodes/{node_id}", response_model=APIResponse[NodeResponse])
async def get_panel_node(
    panel_id: int,
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Get a specific node from a panel."""
    result = await service.get_node(node_id)
    if not result:
        raise HTTPException(status_code=404, detail="Node not found")
    # Verify node belongs to panel
    if result.panel_id != panel_id:
        raise HTTPException(status_code=404, detail="Node not found in this panel")
    return APIResponse(success=True, data=result)


@router.put("/{panel_id}/nodes/{node_id}", response_model=APIResponse[NodeResponse])
async def update_panel_node(
    panel_id: int,
    node_id: int,
    data: NodeUpdate,
    service: NodeService = Depends(get_node_service)
):
    """Update a node in a panel."""
    # First verify node belongs to panel
    existing = await service.get_node(node_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Node not found")
    if existing.panel_id != panel_id:
        raise HTTPException(status_code=404, detail="Node not found in this panel")
    
    result = await service.update_node(node_id, data)
    return APIResponse(success=True, data=result)


@router.delete("/{panel_id}/nodes/{node_id}", response_model=APIResponse[NodeDeleteResponse])
async def delete_panel_node(
    panel_id: int,
    node_id: int,
    options: NodeDeleteOptions = Body(default=NodeDeleteOptions()),
    service: NodeService = Depends(get_node_service)
):
    """
    Delete a node from a panel with optional cascade deletion.
    
    Options:
    - delete_from_marzban: Also delete from Marzban panel
    - delete_from_server: Also uninstall from node server via SSH
    """
    # First verify node belongs to panel
    existing = await service.get_node(node_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Node not found")
    if existing.panel_id != panel_id:
        raise HTTPException(status_code=404, detail="Node not found in this panel")
    
    result = await service.delete_node(
        node_id,
        delete_from_marzban=options.delete_from_marzban,
        delete_from_server=options.delete_from_server
    )
    
    if not result.success:
        raise HTTPException(
            status_code=500, 
            detail=result.errors[0] if result.errors else "Failed to delete node"
        )
    
    return APIResponse(success=True, data=result)


@router.post("/{panel_id}/nodes/{node_id}/reconnect", response_model=APIResponse[dict])
async def reconnect_panel_node(
    panel_id: int,
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Reconnect a node in a panel."""
    # First verify node belongs to panel
    existing = await service.get_node(node_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Node not found")
    if existing.panel_id != panel_id:
        raise HTTPException(status_code=404, detail="Node not found in this panel")
    
    try:
        result = await service.reconnect_node(node_id)
        return APIResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{panel_id}/nodes/{node_id}/templates", response_model=APIResponse[list])
async def assign_node_templates(
    panel_id: int,
    node_id: int,
    data: AssignTemplatesRequest,
    service: NodeService = Depends(get_node_service)
):
    """Assign templates to a node."""
    # First verify node belongs to panel
    existing = await service.get_node(node_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Node not found")
    if existing.panel_id != panel_id:
        raise HTTPException(status_code=404, detail="Node not found in this panel")
    
    try:
        # Convert string IDs to integers
        template_ids = [int(tid) for tid in data.template_ids]
        result = await service.assign_templates(node_id, template_ids)
        return APIResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{panel_id}/nodes/{node_id}/logs", response_model=APIResponse[dict])
async def get_node_logs(
    panel_id: int,
    node_id: int,
    service: NodeService = Depends(get_node_service)
):
    """Get logs for a node."""
    # First verify node belongs to panel
    existing = await service.get_node(node_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Node not found")
    if existing.panel_id != panel_id:
        raise HTTPException(status_code=404, detail="Node not found in this panel")
    
    # For now, return empty logs (logs would come from Marzban or be stored locally)
    return APIResponse(success=True, data={"logs": []})
