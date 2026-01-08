"""
Node Manager CLI Client.

Executes marzban-node-manager CLI commands over SSH.
"""

import logging
import re
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

from app.clients.ssh_client import SSHClient, CommandResult

logger = logging.getLogger(__name__)


@dataclass
class InstallResult:
    """Result of node installation."""
    success: bool
    node_name: str
    service_port: int
    api_port: int
    install_dir: Optional[str] = None
    data_dir: Optional[str] = None
    public_ip: Optional[str] = None
    error: Optional[str] = None


@dataclass
class NodeStatus:
    """Status of a managed node."""
    name: str
    method: str  # docker or normal
    service_port: int
    api_port: int
    running: bool
    container_id: Optional[str] = None
    install_dir: Optional[str] = None
    data_dir: Optional[str] = None


class NodeManagerClient:
    """
    Client for executing marzban-node-manager CLI commands over SSH.
    
    Handles:
    - CLI installation
    - Node installation and configuration
    - Node status checking
    - Node uninstallation
    """
    
    INSTALL_CLI_URL = "https://raw.githubusercontent.com/DrSaeedHub/Marzban-node-manager/main/install-cli.sh"
    
    def __init__(self, ssh: SSHClient):
        """
        Initialize node manager client.
        
        Args:
            ssh: Connected SSHClient instance
        """
        self.ssh = ssh
    
    async def is_cli_installed(self) -> bool:
        """Check if marzban-node-manager CLI is installed."""
        result = await self.ssh.execute("which marzban-node-manager", timeout=10)
        return result.exit_code == 0
    
    async def install_cli(self) -> bool:
        """
        Install the marzban-node-manager CLI.
        
        Returns:
            True if installation succeeded
        """
        logger.info("Installing marzban-node-manager CLI...")
        
        # Download and run install script
        result = await self.ssh.execute(
            f"curl -sSL {self.INSTALL_CLI_URL} | bash",
            timeout=120
        )
        
        if result.exit_code != 0:
            logger.error(f"CLI installation failed: {result.stderr}")
            return False
        
        # Verify installation
        return await self.is_cli_installed()
    
    async def get_cli_version(self) -> Optional[str]:
        """Get installed CLI version."""
        result = await self.ssh.execute(
            "marzban-node-manager --version",
            timeout=10
        )
        if result.exit_code == 0:
            # Parse version from output like "Marzban Node Manager v1.0.0"
            match = re.search(r"v?(\d+\.\d+\.\d+)", result.stdout)
            return match.group(1) if match else result.stdout.strip()
        return None
    
    async def install_node(
        self,
        name: str,
        certificate: str,
        service_port: int = 62050,
        api_port: int = 62051,
        method: str = "docker",
        inbounds: List[str] = None,
        auto_ports: bool = False
    ) -> InstallResult:
        """
        Install a Marzban node.
        
        Args:
            name: Node name
            certificate: SSL client certificate (PEM format)
            service_port: Node service port (ignored if auto_ports=True)
            api_port: Node API port (ignored if auto_ports=True)
            method: Installation method (docker or normal)
            inbounds: List of inbound names to enable
            auto_ports: If True, let CLI auto-assign available ports
            
        Returns:
            InstallResult with installation details (including actual ports used)
        """
        logger.info(f"Installing node '{name}' with {method} method (auto_ports={auto_ports})...")
        
        # Ensure CLI is installed
        if not await self.is_cli_installed():
            if not await self.install_cli():
                return InstallResult(
                    success=False,
                    node_name=name,
                    service_port=service_port,
                    api_port=api_port,
                    error="Failed to install CLI"
                )
        
        # Upload certificate to temp file
        cert_path = f"/tmp/ssl_cert_{name}.pem"
        await self.ssh.upload_content(certificate, cert_path, mode=0o600)
        
        # Build install command
        cmd = f"marzban-node-manager install -n {name} -c {cert_path} -m {method} -y"
        
        # Only add port args if not using auto_ports
        if not auto_ports:
            cmd += f" -s {service_port} -x {api_port}"
        
        if inbounds:
            inbound_str = ",".join(inbounds)
            cmd += f" -i '{inbound_str}'"
        
        # Run installation
        result = await self.ssh.execute(cmd, timeout=300)
        
        # Clean up temp cert file
        await self.ssh.execute(f"rm -f {cert_path}", timeout=10)
        
        # Parse result - pass default ports but parser will extract actual from output
        return self._parse_install_output(result, name, service_port, api_port)
    
    def _parse_install_output(
        self,
        result: CommandResult,
        name: str,
        service_port: int,
        api_port: int
    ) -> InstallResult:
        """
        Parse installation output.
        
        Extracts actual ports used from CLI output (important for auto_ports mode).
        
        CLI output format (with ANSI codes):
          SERVICE_PORT:        62060
          XRAY_API_PORT:       62061
        """
        output = result.stdout + result.stderr
        
        # IMPORTANT: Strip ANSI codes FIRST before parsing
        clean_output = self._strip_ansi(output)
        
        # Extract actual ports from output (CLI prints these after allocation)
        actual_service_port = service_port
        actual_api_port = api_port
        
        # Parse SERVICE_PORT from clean output
        # Format: "  SERVICE_PORT:        62060" (key: value with variable spacing)
        service_match = re.search(r"SERVICE_PORT:\s+(\d+)", clean_output)
        if service_match:
            actual_service_port = int(service_match.group(1))
            logger.debug(f"Parsed SERVICE_PORT from output: {actual_service_port}")
        
        # Parse XRAY_API_PORT from clean output
        api_match = re.search(r"XRAY_API_PORT:\s+(\d+)", clean_output)
        if api_match:
            actual_api_port = int(api_match.group(1))
            logger.debug(f"Parsed XRAY_API_PORT from output: {actual_api_port}")
        
        if result.exit_code != 0:
            # Extract error message
            error = clean_output.strip() or "Installation failed"
            
            return InstallResult(
                success=False,
                node_name=name,
                service_port=actual_service_port,
                api_port=actual_api_port,
                error=error
            )
        
        # Try to extract install details from clean output
        install_dir = None
        data_dir = None
        public_ip = None
        
        # Parse Install Dir (format: "Install Dir:          /opt/nodename")
        match = re.search(r"Install Dir:\s+(\S+)", clean_output)
        if match:
            install_dir = match.group(1)
        
        # Parse Data Dir
        match = re.search(r"Data Dir:\s+(\S+)", clean_output)
        if match:
            data_dir = match.group(1)
        
        # Parse public IP (format: "Use this IP in your Marzban panel: 1.2.3.4")
        match = re.search(r"Use this IP.*?:\s*(\d+\.\d+\.\d+\.\d+)", clean_output)
        if match:
            public_ip = match.group(1)
        
        logger.info(f"Parsed install result: ports={actual_service_port}/{actual_api_port}, ip={public_ip}")
        
        return InstallResult(
            success=True,
            node_name=name,
            service_port=actual_service_port,
            api_port=actual_api_port,
            install_dir=install_dir,
            data_dir=data_dir,
            public_ip=public_ip
        )
    
    def _strip_ansi(self, text: str) -> str:
        """Remove ANSI escape codes from text."""
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        return ansi_escape.sub('', text)
    
    async def get_node_status(self, name: str) -> Optional[NodeStatus]:
        """
        Get status of a specific node.
        
        Args:
            name: Node name
            
        Returns:
            NodeStatus or None if node not found
        """
        result = await self.ssh.execute(
            f"marzban-node-manager status -n {name}",
            timeout=30
        )
        
        if result.exit_code != 0:
            return None
        
        return self._parse_status_output(result.stdout, name)
    
    def _parse_status_output(self, output: str, name: str) -> Optional[NodeStatus]:
        """Parse status output."""
        # Extract information from status output
        running = "● Up" in output or "running" in output.lower()
        
        # Parse method
        method = "docker"
        if "normal" in output.lower() or "systemd" in output.lower():
            method = "normal"
        
        # Parse ports
        service_port = 62050
        api_port = 62051
        
        port_match = re.search(r"(\d+)/(\d+)", output)
        if port_match:
            service_port = int(port_match.group(1))
            api_port = int(port_match.group(2))
        
        # Parse container ID
        container_id = None
        container_match = re.search(r"[a-f0-9]{12}", output)
        if container_match:
            container_id = container_match.group(0)
        
        return NodeStatus(
            name=name,
            method=method,
            service_port=service_port,
            api_port=api_port,
            running=running,
            container_id=container_id
        )
    
    async def list_nodes(self) -> List[str]:
        """
        List all managed nodes.
        
        Returns:
            List of node names
        """
        result = await self.ssh.execute("marzban-node-manager list", timeout=30)
        
        if result.exit_code != 0:
            return []
        
        # Each line is a node name
        return [
            line.strip() 
            for line in result.stdout.strip().split("\n") 
            if line.strip()
        ]
    
    async def start_node(self, name: str) -> bool:
        """Start a node."""
        result = await self.ssh.execute(
            f"marzban-node-manager start -n {name}",
            timeout=60
        )
        return result.exit_code == 0
    
    async def stop_node(self, name: str) -> bool:
        """Stop a node."""
        result = await self.ssh.execute(
            f"marzban-node-manager stop -n {name}",
            timeout=60
        )
        return result.exit_code == 0
    
    async def restart_node(self, name: str) -> bool:
        """Restart a node."""
        result = await self.ssh.execute(
            f"marzban-node-manager restart -n {name}",
            timeout=60
        )
        return result.exit_code == 0
    
    async def uninstall_node(self, name: str, remove_data: bool = False) -> bool:
        """
        Uninstall a node.
        
        Args:
            name: Node name
            remove_data: Also remove data directory
            
        Returns:
            True if uninstallation succeeded
        """
        cmd = f"marzban-node-manager uninstall -n {name} -y"
        
        result = await self.ssh.execute(cmd, timeout=120)
        return result.exit_code == 0
    
    async def get_node_logs(
        self,
        name: str,
        lines: int = 100
    ) -> str:
        """
        Get node logs.
        
        Args:
            name: Node name
            lines: Number of log lines to retrieve
            
        Returns:
            Log content
        """
        result = await self.ssh.execute(
            f"marzban-node-manager logs -n {name} 2>&1 | tail -n {lines}",
            timeout=30
        )
        return result.stdout
