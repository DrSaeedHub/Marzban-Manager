"""
SSH Client Wrapper.

Provides SSH connection management and command execution using Paramiko.
"""

import asyncio
import logging
import io
from typing import Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

import paramiko

from app.config import get_settings

logger = logging.getLogger(__name__)

# Thread pool for running blocking SSH operations
_executor = ThreadPoolExecutor(max_workers=10)


@dataclass
class CommandResult:
    """Result of an SSH command execution."""
    stdout: str
    stderr: str
    exit_code: int
    
    @property
    def success(self) -> bool:
        """Check if command succeeded."""
        return self.exit_code == 0


class SSHClientError(Exception):
    """Base exception for SSH client errors."""
    pass


class SSHConnectionError(SSHClientError):
    """Connection or authentication error."""
    pass


class SSHCommandError(SSHClientError):
    """Command execution error."""
    pass


class SSHClient:
    """
    Async SSH client wrapper using Paramiko.
    
    Provides:
    - Password and key-based authentication
    - Command execution with timeout
    - File upload via SFTP
    - Async interface using thread pool
    
    Usage:
        async with SSHClient(host, port, username, password=password) as ssh:
            result = await ssh.execute("ls -la")
            await ssh.upload_content("file content", "/remote/path")
    """
    
    def __init__(
        self,
        host: str,
        port: int = 22,
        username: str = "root",
        password: str = None,
        private_key: str = None,
        timeout: int = None
    ):
        """
        Initialize SSH client.
        
        Args:
            host: SSH server hostname or IP
            port: SSH port
            username: SSH username
            password: SSH password
            private_key: SSH private key (PEM format)
            timeout: Connection timeout in seconds
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.private_key = private_key
        self.timeout = timeout or get_settings().ssh_timeout
        
        self._client: Optional[paramiko.SSHClient] = None
        self._sftp: Optional[paramiko.SFTPClient] = None
    
    def _connect_sync(self) -> None:
        """Synchronous connection (runs in thread pool)."""
        self._client = paramiko.SSHClient()
        self._client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        connect_kwargs = {
            "hostname": self.host,
            "port": self.port,
            "username": self.username,
            "timeout": self.timeout,
            "banner_timeout": self.timeout,
            "auth_timeout": self.timeout,
        }
        
        # Add authentication method
        if self.private_key:
            # Load private key from string
            key_file = io.StringIO(self.private_key)
            try:
                pkey = paramiko.RSAKey.from_private_key(key_file)
            except paramiko.SSHException:
                key_file.seek(0)
                try:
                    pkey = paramiko.Ed25519Key.from_private_key(key_file)
                except paramiko.SSHException:
                    key_file.seek(0)
                    pkey = paramiko.ECDSAKey.from_private_key(key_file)
            connect_kwargs["pkey"] = pkey
        elif self.password:
            connect_kwargs["password"] = self.password
        else:
            raise SSHConnectionError("No authentication method provided")
        
        try:
            self._client.connect(**connect_kwargs)
            logger.info(f"Connected to SSH server: {self.host}:{self.port}")
        except paramiko.AuthenticationException as e:
            raise SSHConnectionError(f"Authentication failed: {e}")
        except paramiko.SSHException as e:
            raise SSHConnectionError(f"SSH error: {e}")
        except Exception as e:
            raise SSHConnectionError(f"Connection failed: {e}")
    
    async def connect(self) -> None:
        """Establish SSH connection."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(_executor, self._connect_sync)
    
    def _close_sync(self) -> None:
        """Synchronous close (runs in thread pool)."""
        if self._sftp:
            self._sftp.close()
            self._sftp = None
        
        if self._client:
            self._client.close()
            self._client = None
            logger.debug(f"Disconnected from SSH server: {self.host}")
    
    async def close(self) -> None:
        """Close SSH connection."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(_executor, self._close_sync)
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    def _execute_sync(self, command: str, timeout: int) -> CommandResult:
        """Synchronous command execution (runs in thread pool)."""
        if not self._client:
            raise SSHClientError("Not connected")
        
        try:
            stdin, stdout, stderr = self._client.exec_command(
                command,
                timeout=timeout
            )
            
            # Read output
            stdout_str = stdout.read().decode("utf-8", errors="replace")
            stderr_str = stderr.read().decode("utf-8", errors="replace")
            exit_code = stdout.channel.recv_exit_status()
            
            return CommandResult(
                stdout=stdout_str,
                stderr=stderr_str,
                exit_code=exit_code
            )
            
        except paramiko.SSHException as e:
            raise SSHCommandError(f"Command execution failed: {e}")
    
    async def execute(
        self,
        command: str,
        timeout: int = None
    ) -> CommandResult:
        """
        Execute a command on the remote server.
        
        Args:
            command: Command to execute
            timeout: Command timeout in seconds
            
        Returns:
            CommandResult with stdout, stderr, and exit code
        """
        timeout = timeout or self.timeout
        loop = asyncio.get_event_loop()
        
        logger.debug(f"Executing command: {command[:100]}...")
        result = await loop.run_in_executor(
            _executor,
            self._execute_sync,
            command,
            timeout
        )
        
        if result.exit_code != 0:
            logger.warning(
                f"Command exited with code {result.exit_code}: {command[:50]}..."
            )
        
        return result
    
    def _get_sftp_sync(self) -> paramiko.SFTPClient:
        """Get or create SFTP client (synchronous)."""
        if not self._client:
            raise SSHClientError("Not connected")
        
        if not self._sftp:
            self._sftp = self._client.open_sftp()
        
        return self._sftp
    
    def _upload_file_sync(
        self,
        local_path: str,
        remote_path: str
    ) -> None:
        """Upload file (synchronous)."""
        sftp = self._get_sftp_sync()
        sftp.put(local_path, remote_path)
        logger.debug(f"Uploaded file: {local_path} -> {remote_path}")
    
    async def upload_file(
        self,
        local_path: str,
        remote_path: str
    ) -> None:
        """
        Upload a local file to remote server.
        
        Args:
            local_path: Path to local file
            remote_path: Destination path on server
        """
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            _executor,
            self._upload_file_sync,
            local_path,
            remote_path
        )
    
    def _upload_content_sync(
        self,
        content: str,
        remote_path: str,
        mode: int = 0o644
    ) -> None:
        """Upload content as file (synchronous)."""
        sftp = self._get_sftp_sync()
        
        with sftp.file(remote_path, "w") as f:
            f.write(content)
        
        sftp.chmod(remote_path, mode)
        logger.debug(f"Uploaded content to: {remote_path}")
    
    async def upload_content(
        self,
        content: str,
        remote_path: str,
        mode: int = 0o644
    ) -> None:
        """
        Upload string content as a file.
        
        Args:
            content: File content as string
            remote_path: Destination path on server
            mode: File permissions (default: 644)
        """
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            _executor,
            self._upload_content_sync,
            content,
            remote_path,
            mode
        )
    
    def _download_file_sync(
        self,
        remote_path: str,
        local_path: str
    ) -> None:
        """Download file (synchronous)."""
        sftp = self._get_sftp_sync()
        sftp.get(remote_path, local_path)
        logger.debug(f"Downloaded file: {remote_path} -> {local_path}")
    
    async def download_file(
        self,
        remote_path: str,
        local_path: str
    ) -> None:
        """
        Download a file from remote server.
        
        Args:
            remote_path: Path on remote server
            local_path: Destination path locally
        """
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            _executor,
            self._download_file_sync,
            remote_path,
            local_path
        )
    
    def _read_file_sync(self, remote_path: str) -> str:
        """Read file content (synchronous)."""
        sftp = self._get_sftp_sync()
        with sftp.file(remote_path, "r") as f:
            return f.read().decode("utf-8", errors="replace")
    
    async def read_file(self, remote_path: str) -> str:
        """
        Read content of a remote file.
        
        Args:
            remote_path: Path on remote server
            
        Returns:
            File content as string
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            self._read_file_sync,
            remote_path
        )
    
    async def test_connection(self) -> Tuple[bool, Optional[str]]:
        """
        Test SSH connection.
        
        Returns:
            Tuple of (success, error_message)
        """
        try:
            await self.connect()
            result = await self.execute("echo 'connection_test'", timeout=10)
            success = "connection_test" in result.stdout
            await self.close()
            return success, None
        except SSHClientError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Unexpected error: {e}"
