"""
Custom Exception Classes.

Application-specific exceptions for consistent error handling.
"""

from typing import Optional, Dict, Any


class MarzbanManagerError(Exception):
    """Base exception for all application errors."""
    
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)


class ValidationError(MarzbanManagerError):
    """Data validation error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="VALIDATION_ERROR", details=details)


class NotFoundError(MarzbanManagerError):
    """Resource not found error."""
    
    def __init__(self, resource: str, identifier: Any):
        message = f"{resource} with id '{identifier}' not found"
        super().__init__(message, code=f"{resource.upper()}_NOT_FOUND")


class DuplicateError(MarzbanManagerError):
    """Duplicate resource error."""
    
    def __init__(self, resource: str, field: str, value: str):
        message = f"{resource} with {field} '{value}' already exists"
        super().__init__(message, code=f"{resource.upper()}_DUPLICATE")


class AuthenticationError(MarzbanManagerError):
    """Authentication error."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, code="AUTHENTICATION_ERROR")


class AuthorizationError(MarzbanManagerError):
    """Authorization error."""
    
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, code="AUTHORIZATION_ERROR")


class ConnectionError(MarzbanManagerError):
    """External service connection error."""
    
    def __init__(self, service: str, message: str):
        super().__init__(
            f"Failed to connect to {service}: {message}",
            code=f"{service.upper()}_CONNECTION_ERROR"
        )


class ConfigurationError(MarzbanManagerError):
    """Configuration error."""
    
    def __init__(self, message: str):
        super().__init__(message, code="CONFIGURATION_ERROR")
