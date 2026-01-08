"""
Panel Schema Definitions.

Request/Response models for Marzban Panel operations.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl, field_validator


class PanelBase(BaseModel):
    """Base panel fields."""
    name: str = Field(..., min_length=2, max_length=100, description="Panel display name")
    url: str = Field(..., description="Panel base URL")
    
    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Ensure URL has proper format."""
        v = v.strip().rstrip("/")
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class PanelCreate(PanelBase):
    """Schema for creating a new panel."""
    username: str = Field(..., min_length=1, max_length=100, description="Admin username")
    password: str = Field(..., min_length=1, description="Admin password")


class PanelUpdate(BaseModel):
    """Schema for updating a panel."""
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    url: Optional[str] = Field(default=None)
    username: Optional[str] = Field(default=None, min_length=1, max_length=100)
    password: Optional[str] = Field(default=None, min_length=1)
    
    @field_validator("url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        """Ensure URL has proper format if provided."""
        if v is None:
            return v
        v = v.strip().rstrip("/")
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class PanelResponse(BaseModel):
    """Schema for panel response."""
    id: int = Field(..., description="Panel ID")
    name: str = Field(..., description="Panel display name")
    url: str = Field(..., description="Panel base URL")
    username: Optional[str] = Field(default=None, description="Admin username")
    password: Optional[str] = Field(default=None, description="Admin password (only included when fetching single panel)")
    status: str = Field(..., description="Connection status")
    status_message: Optional[str] = Field(default=None, description="Status details/error message")
    node_count: int = Field(default=0, description="Number of nodes")
    certificate: Optional[str] = Field(default=None, description="Node certificate")
    last_sync: Optional[datetime] = Field(default=None, description="Last sync timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")
    
    class Config:
        from_attributes = True


class PanelListResponse(BaseModel):
    """Schema for panel list response."""
    panels: List[PanelResponse] = Field(..., description="List of panels")


class ConnectionTestResponse(BaseModel):
    """Schema for connection test response."""
    connected: bool = Field(..., description="Whether connection succeeded")
    panel_version: Optional[str] = Field(default=None, description="Marzban version")
    admin_username: Optional[str] = Field(default=None, description="Authenticated admin username")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class CertificateResponse(BaseModel):
    """Schema for certificate response."""
    certificate: str = Field(..., description="Node SSL certificate (PEM format)")


class TestConnectionRequest(BaseModel):
    """Schema for testing connection without existing panel."""
    url: str = Field(..., description="Panel base URL")
    username: str = Field(..., min_length=1, max_length=100, description="Admin username")
    password: str = Field(..., min_length=1, description="Admin password")
    
    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Ensure URL has proper format."""
        v = v.strip().rstrip("/")
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class UpdateCredentialsRequest(BaseModel):
    """Schema for updating panel credentials."""
    username: Optional[str] = Field(default=None, min_length=1, max_length=100, description="New admin username")
    password: str = Field(..., min_length=1, description="New admin password")


class DisconnectResponse(BaseModel):
    """Schema for disconnect response."""
    success: bool = Field(..., description="Whether disconnect succeeded")
    message: str = Field(default="Panel disconnected", description="Status message")


class RestartXrayCoreResponse(BaseModel):
    """Schema for Xray core restart response."""
    success: bool = Field(..., description="Whether restart succeeded")
    message: str = Field(default="Xray core restarted", description="Status message")
