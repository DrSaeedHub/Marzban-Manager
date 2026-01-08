"""
Marzban Panel API Client.

HTTP client for interacting with Marzban Panel API with token caching and retry logic.
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class TokenInfo:
    """Token information for a panel."""
    access_token: str
    expires_at: Optional[datetime] = None
    
    def is_expired(self) -> bool:
        """Check if token is expired (with 5 minute buffer)."""
        if not self.expires_at:
            return False
        return datetime.utcnow() >= (self.expires_at - timedelta(minutes=5))


class MarzbanClientError(Exception):
    """Base exception for Marzban client errors."""
    pass


class MarzbanConnectionError(MarzbanClientError):
    """Connection or network error."""
    pass


class MarzbanAuthError(MarzbanClientError):
    """Authentication error."""
    pass


class MarzbanServerError(MarzbanClientError):
    """Server-side error (5xx)."""
    pass


class MarzbanNotFoundError(MarzbanClientError):
    """Resource not found (404)."""
    pass


class MarzbanClient:
    """
    Async HTTP client for Marzban Panel API.
    
    Features:
    - Token caching and auto-refresh
    - Automatic retries with exponential backoff
    - Proper error handling and categorization
    
    Usage:
        async with MarzbanClient(panel_url, username, password) as client:
            nodes = await client.get_nodes()
            config = await client.get_core_config()
    """
    
    def __init__(
        self,
        panel_url: str,
        username: str = None,
        password: str = None,
        access_token: str = None,
        timeout: int = None
    ):
        """
        Initialize Marzban client.
        
        Args:
            panel_url: Base URL of Marzban panel
            username: Admin username (for token refresh)
            password: Admin password (for token refresh)
            access_token: Pre-existing access token
            timeout: Request timeout in seconds
        """
        self.base_url = panel_url.rstrip("/")
        self.username = username
        self.password = password
        self.timeout = timeout or get_settings().marzban_timeout
        
        self._token: Optional[TokenInfo] = None
        if access_token:
            self._token = TokenInfo(access_token=access_token)
        
        self._client: Optional[httpx.AsyncClient] = None
        self._max_retries = get_settings().max_connection_retries
    
    async def __aenter__(self):
        """Async context manager entry."""
        self._client = httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authorization."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        if self._token:
            headers["Authorization"] = f"Bearer {self._token.access_token}"
        
        return headers
    
    async def _ensure_client(self) -> httpx.AsyncClient:
        """Ensure HTTP client is initialized."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True
            )
        return self._client
    
    async def authenticate(self) -> TokenInfo:
        """
        Authenticate with Marzban and get access token.
        
        Returns:
            TokenInfo with access token
            
        Raises:
            MarzbanAuthError: If authentication fails
        """
        if not self.username or not self.password:
            raise MarzbanAuthError("Username and password required for authentication")
        
        client = await self._ensure_client()
        url = f"{self.base_url}/api/admin/token"
        
        try:
            response = await client.post(
                url,
                data={
                    "username": self.username,
                    "password": self.password,
                    "grant_type": "password",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 401:
                raise MarzbanAuthError("Invalid credentials")
            
            response.raise_for_status()
            data = response.json()
            
            self._token = TokenInfo(
                access_token=data["access_token"],
                expires_at=datetime.utcnow() + timedelta(hours=24)  # Default expiry
            )
            
            logger.info(f"Authenticated with Marzban panel: {self.base_url}")
            return self._token
            
        except httpx.HTTPError as e:
            raise MarzbanConnectionError(f"Connection error during auth: {e}")
    
    async def _ensure_authenticated(self) -> None:
        """Ensure we have a valid token."""
        if not self._token or self._token.is_expired():
            await self.authenticate()
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        json: Dict = None,
        params: Dict = None,
        retry_auth: bool = True
    ) -> Any:
        """
        Make an authenticated request with retry logic.
        
        Args:
            method: HTTP method
            endpoint: API endpoint (without base URL)
            json: JSON body
            params: Query parameters
            retry_auth: Retry on 401 with fresh token
            
        Returns:
            Response JSON data
        """
        await self._ensure_authenticated()
        client = await self._ensure_client()
        
        url = f"{self.base_url}{endpoint}"
        last_error = None
        
        for attempt in range(self._max_retries):
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    json=json,
                    params=params,
                    headers=self._get_headers()
                )
                
                # Handle auth errors
                if response.status_code == 401:
                    if retry_auth:
                        logger.info("Token expired, refreshing...")
                        await self.authenticate()
                        return await self._request(
                            method, endpoint, json, params, retry_auth=False
                        )
                    raise MarzbanAuthError("Authentication failed")
                
                # Handle 404
                if response.status_code == 404:
                    raise MarzbanNotFoundError(f"Resource not found: {endpoint}")
                
                # Handle server errors
                if response.status_code >= 500:
                    raise MarzbanServerError(
                        f"Server error {response.status_code}: {response.text}"
                    )
                
                response.raise_for_status()
                
                # Return JSON or None for empty responses
                if response.content:
                    return response.json()
                return None
                
            except httpx.TimeoutException as e:
                last_error = MarzbanConnectionError(f"Request timeout: {e}")
                logger.warning(f"Timeout on attempt {attempt + 1}: {e}")
                
            except httpx.NetworkError as e:
                last_error = MarzbanConnectionError(f"Network error: {e}")
                logger.warning(f"Network error on attempt {attempt + 1}: {e}")
            
            except (MarzbanAuthError, MarzbanNotFoundError):
                raise
            
            except httpx.HTTPStatusError as e:
                last_error = MarzbanClientError(f"HTTP error: {e}")
                logger.warning(f"HTTP error on attempt {attempt + 1}: {e}")
            
            # Exponential backoff
            if attempt < self._max_retries - 1:
                delay = 2 ** attempt
                logger.info(f"Retrying in {delay}s...")
                await asyncio.sleep(delay)
        
        raise last_error or MarzbanConnectionError("Max retries exceeded")
    
    # === Admin API ===
    
    async def get_current_admin(self) -> Dict[str, Any]:
        """Get current authenticated admin info."""
        return await self._request("GET", "/api/admin")
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to panel.
        
        Returns:
            Dict with connection status and admin info
        """
        try:
            admin = await self.get_current_admin()
            return {
                "connected": True,
                "admin_username": admin.get("username"),
                "is_sudo": admin.get("is_sudo", False)
            }
        except MarzbanAuthError:
            return {"connected": False, "error": "Invalid credentials"}
        except MarzbanConnectionError as e:
            return {"connected": False, "error": str(e)}
    
    # === Node API ===
    
    async def get_node_settings(self) -> Dict[str, Any]:
        """
        Get node settings including certificate.
        
        Returns:
            Node settings with certificate
        """
        return await self._request("GET", "/api/node/settings")
    
    async def get_nodes(self) -> List[Dict[str, Any]]:
        """Get all nodes."""
        return await self._request("GET", "/api/nodes")
    
    async def get_node(self, node_id: int) -> Dict[str, Any]:
        """Get node by ID."""
        return await self._request("GET", f"/api/node/{node_id}")
    
    async def create_node(
        self,
        name: str,
        address: str,
        port: int = 62050,
        api_port: int = 62051,
        usage_coefficient: float = 1.0,
        add_as_new_host: bool = True
    ) -> Dict[str, Any]:
        """
        Create a new node.
        
        Args:
            name: Node name
            address: Node IP or hostname
            port: Service port
            api_port: API port
            usage_coefficient: Traffic coefficient
            add_as_new_host: Add as new host
            
        Returns:
            Created node data
        """
        return await self._request("POST", "/api/node", json={
            "name": name,
            "address": address,
            "port": port,
            "api_port": api_port,
            "usage_coefficient": usage_coefficient,
            "add_as_new_host": add_as_new_host
        })
    
    async def update_node(
        self,
        node_id: int,
        **kwargs
    ) -> Dict[str, Any]:
        """Update a node."""
        return await self._request("PUT", f"/api/node/{node_id}", json=kwargs)
    
    async def delete_node(self, node_id: int) -> None:
        """Delete a node."""
        await self._request("DELETE", f"/api/node/{node_id}")
    
    async def reconnect_node(self, node_id: int) -> Dict[str, Any]:
        """Reconnect a node."""
        return await self._request("POST", f"/api/node/{node_id}/reconnect")
    
    async def get_nodes_usage(self) -> List[Dict[str, Any]]:
        """Get usage statistics for all nodes."""
        return await self._request("GET", "/api/nodes/usage")
    
    # === Core Config API ===
    
    async def get_core_config(self) -> Dict[str, Any]:
        """Get Xray core configuration."""
        return await self._request("GET", "/api/core/config")
    
    async def update_core_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update Xray core configuration.
        
        Args:
            config: Full Xray configuration JSON
            
        Returns:
            Updated configuration
        """
        return await self._request("PUT", "/api/core/config", json=config)
    
    # === System API ===
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get system statistics."""
        return await self._request("GET", "/api/system")
    
    async def restart_core(self) -> None:
        """Restart Xray core."""
        await self._request("POST", "/api/core/restart")
    
    @property
    def token(self) -> Optional[str]:
        """Get current access token."""
        return self._token.access_token if self._token else None
    
    @property
    def token_expires_at(self) -> Optional[datetime]:
        """Get token expiry time."""
        return self._token.expires_at if self._token else None
