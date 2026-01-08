"""
Template Schema Definitions.

Request/Response models for Configuration Template operations.
"""

from datetime import datetime
from typing import Optional, List, Any, Literal
from pydantic import BaseModel, Field, field_validator


ProtocolType = Literal["vless", "vmess", "trojan", "shadowsocks"]
TransportType = Literal["tcp", "kcp", "ws", "grpc", "httpupgrade", "xhttp"]
SecurityType = Literal["none", "tls", "reality"]


class TemplateBase(BaseModel):
    """Base template fields."""
    tag: str = Field(..., min_length=1, max_length=100, description="Template tag/name")
    protocol: ProtocolType = Field(..., description="Protocol type")
    transport: TransportType = Field(..., description="Transport type")
    security: SecurityType = Field(..., description="Security type")
    port: int = Field(..., ge=1, le=65535, description="Inbound port")
    config: dict = Field(..., description="Full inbound configuration JSON")
    
    @field_validator("config")
    @classmethod
    def validate_config(cls, v: dict) -> dict:
        """Basic validation of config structure."""
        if not isinstance(v, dict):
            raise ValueError("Config must be a JSON object")
        return v


class TemplateCreate(TemplateBase):
    """Schema for creating a new template."""
    pass


class TemplateUpdate(BaseModel):
    """Schema for updating a template."""
    tag: Optional[str] = Field(default=None, min_length=1, max_length=100)
    protocol: Optional[ProtocolType] = Field(default=None)
    transport: Optional[TransportType] = Field(default=None)
    security: Optional[SecurityType] = Field(default=None)
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    config: Optional[dict] = Field(default=None)


class TemplateResponse(BaseModel):
    """Schema for template response."""
    id: int = Field(..., description="Template ID")
    tag: str = Field(..., description="Template tag/name")
    protocol: str = Field(..., description="Protocol type")
    transport: str = Field(..., description="Transport type")
    security: str = Field(..., description="Security type")
    port: int = Field(..., description="Inbound port")
    config: dict = Field(..., description="Full configuration JSON")
    used_by_nodes: int = Field(default=0, description="Number of nodes using this template")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")
    
    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Schema for template list response."""
    templates: List[TemplateResponse] = Field(..., description="List of templates")
