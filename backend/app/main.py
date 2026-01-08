"""
Marzban Manager Backend Application.

FastAPI application entry point with lifespan management, middleware setup,
and code-first database initialization.
"""

from app.api.router import api_router
from app.db.schema_manager import ensure_database_ready
from app.db.connection import init_pool, close_pool
from app.core.middleware import setup_middleware
from app.core.logging import configure_logging
from app.config import get_settings
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

# Add parent directory to path for imports when running directly
sys.path.insert(0, str(Path(__file__).parent.parent))


# Initialize settings and logging early
settings = get_settings()
configure_logging()
logger = structlog.get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown tasks:
    - Database initialization (code-first)
    - Connection pool management
    - Background tasks
    """
    # === STARTUP ===
    logger.info(
        "application_starting",
        environment=settings.environment_name,
        debug=settings.debug,
    )

    try:
        # Step 1: Ensure database and schema exist (code-first)
        logger.info("initializing_database")
        ensure_database_ready()
        logger.info("database_initialized")

        # Step 2: Initialize connection pool
        logger.info("initializing_connection_pool")
        init_pool(
            min_connections=settings.db_pool_min,
            max_connections=settings.db_pool_max,
        )
        logger.info("connection_pool_initialized")

        # Step 3: Start background tasks (if any)
        # TODO: Add periodic sync tasks

        logger.info(
            "application_started",
            api_base_url=settings.api_base_url,
            api_port=settings.api_port,
        )

    except Exception as e:
        logger.error("startup_failed", error=str(e))
        raise

    yield

    # === SHUTDOWN ===
    logger.info("application_stopping")

    # Stop background tasks
    # TODO: Stop periodic tasks

    # Close connection pool
    close_pool()

    logger.info("application_stopped")


def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI instance
    """
    app = FastAPI(
        title="Marzban Manager API",
        description="Backend API for managing Marzban panels, nodes, and configurations",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # Setup custom middleware
    setup_middleware(app)

    # Include API router
    app.include_router(api_router, prefix="/api")

    return app


# Create application instance
app = create_application()


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - redirect to docs or return API info."""
    return {
        "name": "Marzban Manager API",
        "version": "1.0.0",
        "docs": "/docs" if settings.debug else None,
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn

    # Load .env file if running directly
    from dotenv import load_dotenv

    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )
