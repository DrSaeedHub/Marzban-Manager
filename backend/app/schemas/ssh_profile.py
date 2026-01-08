"""
SSH Profile Schema Definitions.

Request/Response models for SSH Profile operations.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class SSHProfileBase(BaseModel):
    """Base SSH profile fields."""
    profile_name: str = Field(..., min_length=2, max_length=100, description="Profile display name")
    host: str = Field(..., min_length=1, max_length=255, description="SSH host IP or hostname")
    port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    username: str = Field(default="root", min_length=1, max_length=100, description="SSH username")
    default_service_port: int = Field(default=62050, ge=1, le=65535, description="Default node service port")
    default_api_port: int = Field(default=62051, ge=1, le=65535, description="Default node API port")
    install_docker: bool = Field(default=True, description="Install Docker if not present")
    auto_start_node: bool = Field(default=True, description="Start node after installation")


class SSHProfileCreate(SSHProfileBase):
    """Schema for creating a new SSH profile."""
    password: Optional[str] = Field(default=None, description="SSH password")
    private_key: Optional[str] = Field(default=None, description="SSH private key (PEM format)")
    use_key_auth: bool = Field(default=False, description="Use key-based authentication")
    
    @field_validator("password", "private_key")
    @classmethod
    def validate_auth(cls, v: Optional[str], info) -> Optional[str]:
        """At least one auth method must be provided on creation."""
        return v


class SSHProfileUpdate(BaseModel):
    """Schema for updating an SSH profile."""
    profile_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    host: Optional[str] = Field(default=None, min_length=1, max_length=255)
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    username: Optional[str] = Field(default=None, min_length=1, max_length=100)
    password: Optional[str] = Field(default=None)
    private_key: Optional[str] = Field(default=None)
    use_key_auth: Optional[bool] = Field(default=None)
    default_service_port: Optional[int] = Field(default=None, ge=1, le=65535)
    default_api_port: Optional[int] = Field(default=None, ge=1, le=65535)
    install_docker: Optional[bool] = Field(default=None)
    auto_start_node: Optional[bool] = Field(default=None)


class SSHProfileResponse(BaseModel):
    """Schema for SSH profile response."""
    id: int = Field(..., description="Profile ID")
    profile_name: str = Field(..., description="Profile display name")
    host: str = Field(..., description="SSH host")
    port: int = Field(..., description="SSH port")
    username: str = Field(..., description="SSH username")
    use_key_auth: bool = Field(..., description="Using key-based auth")
    has_password: bool = Field(..., description="Has password stored")
    has_private_key: bool = Field(..., description="Has private key stored")
    default_service_port: int = Field(..., description="Default service port")
    default_api_port: int = Field(..., description="Default API port")
    install_docker: bool = Field(..., description="Install Docker by default")
    auto_start_node: bool = Field(..., description="Auto-start node after install")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")
    
    class Config:
        from_attributes = True


class SSHProfileListResponse(BaseModel):
    """Schema for SSH profile list response."""
    profiles: List[SSHProfileResponse] = Field(..., description="List of profiles")


class SSHConnectionTestResponse(BaseModel):
    """Schema for SSH connection test response."""
    connected: bool = Field(..., description="Whether connection succeeded")
    server_info: Optional[str] = Field(default=None, description="Server identification string")
    error: Optional[str] = Field(default=None, description="Error message if failed")
