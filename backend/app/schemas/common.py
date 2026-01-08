"""
Common Schema Definitions.

Shared models for API responses, pagination, and error handling.
"""

from datetime import datetime
from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel, Field

# Generic type for response data
T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Error detail model."""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(default=None, description="Additional error details")


class ResponseMeta(BaseModel):
    """Response metadata."""
    request_id: Optional[str] = Field(default=None, description="Request correlation ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")


class APIResponse(BaseModel, Generic[T]):
    """
    Standard API response envelope.
    
    All API responses follow this structure for consistency.
    """
    success: bool = Field(..., description="Whether the request succeeded")
    data: Optional[T] = Field(default=None, description="Response data")
    error: Optional[ErrorDetail] = Field(default=None, description="Error details if failed")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Response metadata")


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, description="Items per page")
    
    @property
    def offset(self) -> int:
        """Calculate offset for SQL queries."""
        return (self.page - 1) * self.per_page


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response model."""
    items: list[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")
    pages: int = Field(..., description="Total number of pages")


class StatusEnum:
    """Status constants matching database lookup tables."""
    CONNECTED = 10
    CONNECTING = 20
    ERROR = 30
    DISABLED = 40
    
    @classmethod
    def to_string(cls, status_id: int) -> str:
        """Convert status ID to string."""
        mapping = {
            cls.CONNECTED: "connected",
            cls.CONNECTING: "connecting",
            cls.ERROR: "error",
            cls.DISABLED: "disabled",
        }
        return mapping.get(status_id, "unknown")
    
    @classmethod
    def from_string(cls, status: str) -> int:
        """Convert status string to ID."""
        mapping = {
            "connected": cls.CONNECTED,
            "connecting": cls.CONNECTING,
            "error": cls.ERROR,
            "disabled": cls.DISABLED,
        }
        return mapping.get(status.lower(), cls.CONNECTING)
