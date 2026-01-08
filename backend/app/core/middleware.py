"""
FastAPI Middleware.

Provides correlation ID tracking, request logging, and error handling.
"""

import time
import uuid
from typing import Callable
from datetime import datetime

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import structlog

from app.core.exceptions import MarzbanManagerError
from app.schemas.common import APIResponse, ErrorDetail, ResponseMeta


async def correlation_id_middleware(request: Request, call_next: Callable) -> Response:
    """
    Add correlation ID to each request for tracing.

    Extracts X-Request-ID from headers or generates a new one.
    Adds the ID to response headers and log context.
    """
    # Get or generate request ID
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    # Bind to structlog context
    structlog.contextvars.bind_contextvars(request_id=request_id)

    # Store in request state for access in routes
    request.state.request_id = request_id

    # Process request
    response = await call_next(request)

    # Add to response headers
    response.headers["X-Request-ID"] = request_id

    # Clear context
    structlog.contextvars.unbind_contextvars("request_id")

    return response


async def request_logging_middleware(request: Request, call_next: Callable) -> Response:
    """
    Log request details and timing.
    """
    logger = structlog.get_logger("http")

    # Start timing
    start_time = time.perf_counter()

    # Log request
    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else None,
    )

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration_ms = (time.perf_counter() - start_time) * 1000

    # Log response
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration_ms, 2),
    )

    return response


def add_exception_handlers(app: FastAPI) -> None:
    """
    Add global exception handlers to the FastAPI app.
    """

    @app.exception_handler(MarzbanManagerError)
    async def marzban_error_handler(
        request: Request,
        exc: MarzbanManagerError
    ) -> JSONResponse:
        """Handle application-specific errors."""
        logger = structlog.get_logger("error")
        logger.warning(
            "application_error",
            error_code=exc.code,
            error_message=exc.message,
            details=exc.details,
        )

        # Map error codes to HTTP status codes
        status_map = {
            "VALIDATION_ERROR": 400,
            "AUTHENTICATION_ERROR": 401,
            "AUTHORIZATION_ERROR": 403,
            "INTERNAL_ERROR": 500,
        }

        # Default to 400 for most errors, 500 for internal
        status_code = status_map.get(exc.code, 400)
        if "_NOT_FOUND" in exc.code:
            status_code = 404
        elif "_DUPLICATE" in exc.code:
            status_code = 409
        elif "_CONNECTION_ERROR" in exc.code:
            status_code = 502

        response = APIResponse(
            success=False,
            error=ErrorDetail(
                code=exc.code,
                message=exc.message,
                details=exc.details if exc.details else None,
            ),
            meta=ResponseMeta(
                request_id=getattr(request.state, "request_id", None),
                timestamp=datetime.utcnow(),
            ),
        )

        return JSONResponse(
            status_code=status_code,
            content=response.model_dump(mode="json"),
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(
        request: Request,
        exc: ValueError
    ) -> JSONResponse:
        """Handle ValueError as validation errors."""
        logger = structlog.get_logger("error")
        logger.warning("validation_error", error=str(exc))

        response = APIResponse(
            success=False,
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message=str(exc),
            ),
            meta=ResponseMeta(
                request_id=getattr(request.state, "request_id", None),
                timestamp=datetime.utcnow(),
            ),
        )

        return JSONResponse(
            status_code=400,
            content=response.model_dump(mode="json"),
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """Handle unexpected errors."""
        logger = structlog.get_logger("error")
        logger.exception("unhandled_exception", error=str(exc))

        response = APIResponse(
            success=False,
            error=ErrorDetail(
                code="INTERNAL_ERROR",
                message="An unexpected error occurred",
            ),
            meta=ResponseMeta(
                request_id=getattr(request.state, "request_id", None),
                timestamp=datetime.utcnow(),
            ),
        )

        return JSONResponse(
            status_code=500,
            content=response.model_dump(mode="json"),
        )


def setup_middleware(app: FastAPI) -> None:
    """
    Set up all middleware for the FastAPI app.
    """
    # Add middleware (order matters - last added runs first)
    app.middleware("http")(request_logging_middleware)
    app.middleware("http")(correlation_id_middleware)

    # Add exception handlers
    add_exception_handlers(app)
