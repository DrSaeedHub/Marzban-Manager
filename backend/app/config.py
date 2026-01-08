"""
Application Configuration.

Loads settings from environment variables and .env file using pydantic-settings.
"""

import os
import secrets
from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All settings can be overridden via environment variables or .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # === Database Settings ===
    db_host: str = Field(default="localhost", description="PostgreSQL host")
    db_port: int = Field(default=5432, description="PostgreSQL port")
    db_user: str = Field(default="postgres", description="PostgreSQL username")
    db_password: str = Field(default="", description="PostgreSQL password")
    db_name: str = Field(default="MarzbanManager", description="Database name")

    # Connection pool settings
    db_pool_min: int = Field(default=2, description="Minimum pool connections")
    db_pool_max: int = Field(
        default=10, description="Maximum pool connections")

    # === API Server Settings ===
    api_host: str = Field(default="127.0.0.1", description="API server host")
    api_port: int = Field(default=5000, description="API server port")
    api_base_url: str = Field(
        default="http://127.0.0.1:5000/",
        description="Base URL for API (used by frontend)"
    )

    # === WebPanel Settings (for CORS) ===
    webpanel_host: str = Field(default="127.0.0.1", alias="webpanel_host")
    webpanel_port: int = Field(default=8000, alias="webpanel_port")

    # === Security Settings ===
    encryption_key: Optional[str] = Field(
        default=None,
        description="Encryption key for credentials (base64 or passphrase)"
    )
    api_secret_key: str = Field(
        default_factory=lambda: secrets.token_hex(32),
        description="Secret key for API authentication"
    )

    # === Environment Settings ===
    environment_name: str = Field(
        default="MarzbanManager", description="Environment name")
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")

    # === Connection Settings ===
    marzban_timeout: int = Field(
        default=30, description="Marzban API timeout in seconds")
    ssh_timeout: int = Field(
        default=60, description="SSH connection timeout in seconds")
    max_connection_retries: int = Field(
        default=3, description="Max retry attempts")

    # === CORS Settings ===
    cors_origins: list[str] = Field(
        default_factory=list,
        description="Allowed CORS origins"
    )

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Ensure log level is valid."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(
                f"Invalid log level: {v}. Must be one of {valid_levels}")
        return v_upper

    @property
    def database_url(self) -> str:
        """Get PostgreSQL connection URL."""
        if self.db_password:
            return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
        return f"postgresql://{self.db_user}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def webpanel_url(self) -> str:
        """Get WebPanel URL for CORS."""
        return f"http://{self.webpanel_host}:{self.webpanel_port}"

    @property
    def allowed_origins(self) -> list[str]:
        """Get list of allowed CORS origins."""
        origins = list(self.cors_origins)
        # Always allow the configured WebPanel URL
        webpanel = self.webpanel_url
        if webpanel not in origins:
            origins.append(webpanel)
        # In debug mode, allow localhost variations
        if self.debug:
            localhost_origins = [
                "http://localhost:8000",
                "http://127.0.0.1:8000",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8080",
                "http://127.0.0.1:8080",
            ]
            for origin in localhost_origins:
                if origin not in origins:
                    origins.append(origin)
        return origins


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses LRU cache to ensure settings are only loaded once.

    Returns:
        Settings instance
    """
    # Find .env file - check app directory and parent directories
    env_paths = [
        ".env",
        "../.env",
        "../../.env",
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
    ]

    env_file = None
    for path in env_paths:
        if os.path.exists(path):
            env_file = path
            break

    if env_file:
        return Settings(_env_file=env_file)
    return Settings()


def reset_settings() -> None:
    """Clear the settings cache (useful for testing)."""
    get_settings.cache_clear()


# Convenience access
settings = get_settings()
