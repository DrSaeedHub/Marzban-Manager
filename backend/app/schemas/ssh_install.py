"""
SSH Installation Schema Definitions.

Request/Response models for SSH-based node installation.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, model_validator


JobStatus = Literal["pending", "running", "completed", "failed", "cancelled"]


class SSHInstallRequest(BaseModel):
    """Schema for SSH installation request."""
    # SSH credentials - either profile_id OR inline credentials
    ssh_profile_id: Optional[int] = Field(
        default=None, description="Existing SSH profile ID")

    # Inline credentials (used if ssh_profile_id is None)
    ssh_host: Optional[str] = Field(default=None, description="SSH host")
    ssh_port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    ssh_username: str = Field(default="root", description="SSH username")
    ssh_password: Optional[str] = Field(
        default=None, description="SSH password")
    ssh_private_key: Optional[str] = Field(
        default=None, description="SSH private key")

    # Node configuration
    node_name: str = Field(..., min_length=2,
                           max_length=100, description="Node name")
    service_port: int = Field(
        default=62050, ge=1, le=65535, description="Node service port")
    api_port: int = Field(default=62051, ge=1, le=65535,
                          description="Node API port")

    # Installation options
    install_docker: bool = Field(
        default=True, description="Install Docker if not present")
    auto_start: bool = Field(
        default=True, description="Start node after installation")
    auto_ports: bool = Field(
        default=False, description="Let CLI auto-assign available ports")
    inbounds: Optional[List[str]] = Field(
        default=None, description="Inbound names to enable")

    @model_validator(mode="after")
    def validate_credentials(self):
        """Ensure either profile_id or inline credentials are provided."""
        if self.ssh_profile_id is None and self.ssh_host is None:
            raise ValueError(
                "Either ssh_profile_id or ssh_host must be provided")
        if self.ssh_profile_id is None:
            if not self.ssh_password and not self.ssh_private_key:
                raise ValueError(
                    "SSH password or private key required for inline credentials")
        return self


class SSHInstallJobResponse(BaseModel):
    """Schema for installation job status response."""
    job_id: str = Field(..., description="Unique job ID")
    status: JobStatus = Field(..., description="Current job status")
    progress: int = Field(default=0, ge=0, le=100,
                          description="Progress percentage")
    current_step: Optional[str] = Field(
        default=None, description="Current step description")
    logs: List[str] = Field(default_factory=list,
                            description="Installation log lines")
    started_at: Optional[datetime] = Field(
        default=None, description="Job start time")
    completed_at: Optional[datetime] = Field(
        default=None, description="Job completion time")
    error: Optional[str] = Field(
        default=None, description="Error message if failed")
    result: Optional[dict] = Field(
        default=None, description="Installation result data")


class SSHInstallStartResponse(BaseModel):
    """Schema for installation start response."""
    job_id: str = Field(..., description="Unique job ID")
    status: JobStatus = Field(
        default="pending", description="Initial job status")
    message: str = Field(default="Installation job queued",
                         description="Status message")
