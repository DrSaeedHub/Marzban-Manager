"""
Node Schema Definitions.

Request/Response models for Node operations.
"""

from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


class NodeBase(BaseModel):
    """Base node fields."""
    name: str = Field(..., min_length=2, max_length=100, description="Node display name")
    address: str = Field(..., min_length=1, max_length=255, description="Node IP or hostname")
    service_port: int = Field(default=62050, ge=1, le=65535, description="Marzban node service port")
    api_port: int = Field(default=62051, ge=1, le=65535, description="Marzban node API port")
    usage_coefficient: float = Field(default=1.0, gt=0, description="Traffic usage coefficient")
    
    @field_validator("service_port", "api_port")
    @classmethod
    def validate_ports(cls, v: int) -> int:
        """Validate port is in valid range."""
        if not 1 <= v <= 65535:
            raise ValueError("Port must be between 1 and 65535")
        return v


class NodeCreate(NodeBase):
    """Schema for creating a new node."""
    add_as_new_host: bool = Field(default=True, description="Add node as new host in Marzban")


class NodeUpdate(BaseModel):
    """Schema for updating a node."""
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    address: Optional[str] = Field(default=None, min_length=1, max_length=255)
    service_port: Optional[int] = Field(default=None, ge=1, le=65535)
    api_port: Optional[int] = Field(default=None, ge=1, le=65535)
    usage_coefficient: Optional[float] = Field(default=None, gt=0)


class NodeResponse(BaseModel):
    """Schema for node response."""
    id: int = Field(..., description="Node ID (local)")
    marzban_node_id: Optional[int] = Field(default=None, description="Node ID in Marzban")
    panel_id: int = Field(..., description="Parent panel ID")
    name: str = Field(..., description="Node display name")
    address: str = Field(..., description="Node IP or hostname")
    service_port: int = Field(..., description="Service port")
    api_port: int = Field(..., description="API port")
    status: str = Field(..., description="Connection status")
    status_message: Optional[str] = Field(default=None, description="Status details")
    xray_version: Optional[str] = Field(default=None, description="Xray version")
    usage_coefficient: float = Field(..., description="Traffic coefficient")
    uplink: int = Field(default=0, description="Upload traffic in bytes")
    downlink: int = Field(default=0, description="Download traffic in bytes")
    assigned_templates: List[str] = Field(default_factory=list, description="Assigned template tags")
    ssh_profile_id: Optional[int] = Field(default=None, description="SSH profile ID for server access")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")
    
    class Config:
        from_attributes = True


class NodeListResponse(BaseModel):
    """Schema for node list response."""
    nodes: List[NodeResponse] = Field(..., description="List of nodes")


class NodeStatusResponse(BaseModel):
    """Schema for real-time node status."""
    id: int = Field(..., description="Node ID")
    status: str = Field(..., description="Connection status")
    xray_version: Optional[str] = Field(default=None, description="Xray version")
    uplink: int = Field(default=0, description="Upload traffic")
    downlink: int = Field(default=0, description="Download traffic")
    message: Optional[str] = Field(default=None, description="Status message")


class AssignTemplatesRequest(BaseModel):
    """Schema for assigning templates to a node."""
    template_ids: List[str] = Field(..., description="List of template IDs to assign")


class NodeLogsResponse(BaseModel):
    """Schema for node logs response."""
    logs: List[str] = Field(default_factory=list, description="List of log entries")


class NodeDeleteOptions(BaseModel):
    """Options for node deletion."""
    delete_from_marzban: bool = Field(
        default=False, 
        description="Also delete from Marzban panel"
    )
    delete_from_server: bool = Field(
        default=False, 
        description="Also uninstall from node server via SSH"
    )


class NodeDeleteResponse(BaseModel):
    """Response for node deletion with detailed results."""
    success: bool = Field(..., description="Overall success status")
    local: bool = Field(default=False, description="Deleted from local database")
    marzban: Optional[bool] = Field(default=None, description="Deleted from Marzban panel (null if not requested)")
    server: Optional[bool] = Field(default=None, description="Uninstalled from server (null if not requested)")
    errors: List[str] = Field(default_factory=list, description="List of error messages")
