"""
SSH Installation Service.

Orchestrates node installation via SSH using the node-manager CLI.
"""

import asyncio
import logging
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass, field

from app.db.connection import DatabaseConnection
from app.repositories.panel_repo import PanelRepository, PanelCredentialRepository
from app.repositories.node_repo import NodeRepository
from app.repositories.ssh_profile_repo import SSHProfileRepository
from app.repositories.audit_repo import log_audit
from app.clients.ssh_client import SSHClient
from app.clients.node_manager_client import NodeManagerClient
from app.clients.marzban_client import MarzbanClient
from app.schemas.common import StatusEnum
from app.schemas.ssh_install import SSHInstallRequest, SSHInstallJobResponse, JobStatus

logger = logging.getLogger(__name__)


# In-memory job storage (replace with Redis/DB in production)
_install_jobs: Dict[str, "InstallJob"] = {}


@dataclass
class InstallJob:
    """Represents an SSH installation job."""
    job_id: str
    panel_id: int
    node_name: str
    status: JobStatus = "pending"
    progress: int = 0
    current_step: str = ""
    logs: List[str] = field(default_factory=list)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    
    def add_log(self, message: str) -> None:
        """Add a log message."""
        self.logs.append(message)
        logger.debug(f"[{self.job_id}] {message}")
    
    def to_response(self) -> SSHInstallJobResponse:
        """Convert to response model."""
        return SSHInstallJobResponse(
            job_id=self.job_id,
            status=self.status,
            progress=self.progress,
            current_step=self.current_step,
            logs=self.logs,
            started_at=self.started_at,
            completed_at=self.completed_at,
            error=self.error,
            result=self.result,
        )


class SSHInstallService:
    """Service for SSH-based node installation."""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.panel_repo = PanelRepository(db)
        self.credential_repo = PanelCredentialRepository(db)
        self.node_repo = NodeRepository(db)
        self.ssh_profile_repo = SSHProfileRepository(db)
    
    async def start_installation(
        self,
        panel_id: int,
        request: SSHInstallRequest,
        client_ip: str = None
    ) -> str:
        """
        Start an SSH installation job.
        
        Args:
            panel_id: Panel to install node for
            request: Installation request with SSH credentials and options
            client_ip: Client IP for audit logging
            
        Returns:
            Job ID for tracking progress
        """
        # Validate panel exists
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")
        
        # Create job
        job_id = str(uuid.uuid4())
        job = InstallJob(
            job_id=job_id,
            panel_id=panel_id,
            node_name=request.node_name,
        )
        _install_jobs[job_id] = job
        
        # Start background task
        asyncio.create_task(
            self._run_installation(job, request, client_ip)
        )
        
        logger.info(f"Started SSH installation job: {job_id}")
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[SSHInstallJobResponse]:
        """Get installation job status."""
        job = _install_jobs.get(job_id)
        if not job:
            return None
        return job.to_response()
    
    async def _run_installation(
        self,
        job: InstallJob,
        request: SSHInstallRequest,
        client_ip: str = None
    ) -> None:
        """
        Run the installation process (background task).
        
        Args:
            job: InstallJob instance
            request: Installation request
            client_ip: Client IP for audit
        """
        job.status = "running"
        job.started_at = datetime.utcnow()
        
        try:
            # Step 1: Get SSH credentials and determine/create SSH profile
            job.current_step = "Preparing SSH credentials"
            job.progress = 5
            job.add_log("Preparing SSH credentials...")
            
            ssh_creds = await self._get_ssh_credentials(request)
            
            # Determine SSH profile ID - use existing or create new
            ssh_profile_id = await self._get_or_create_ssh_profile(request, job)
            
            # Step 2: Get panel certificate
            job.current_step = "Fetching certificate"
            job.progress = 10
            job.add_log("Fetching certificate from panel...")
            
            certificate = await self._get_certificate(job.panel_id)
            if not certificate:
                raise ValueError("Failed to fetch certificate from panel")
            
            job.add_log("Certificate fetched successfully")
            
            # Step 3: Connect via SSH
            job.current_step = "Connecting to server"
            job.progress = 20
            job.add_log(f"Connecting to {ssh_creds['host']}:{ssh_creds['port']}...")
            
            async with SSHClient(
                host=ssh_creds["host"],
                port=ssh_creds["port"],
                username=ssh_creds["username"],
                password=ssh_creds.get("password"),
                private_key=ssh_creds.get("private_key"),
            ) as ssh:
                job.add_log(f"Connected to {ssh_creds['host']}")
                
                # Step 4: Check/install CLI
                job.current_step = "Checking node-manager CLI"
                job.progress = 30
                
                nm = NodeManagerClient(ssh)
                
                if not await nm.is_cli_installed():
                    job.add_log("Installing node-manager CLI...")
                    job.current_step = "Installing CLI"
                    job.progress = 40
                    
                    if not await nm.install_cli():
                        raise ValueError("Failed to install node-manager CLI")
                    
                    job.add_log("CLI installed successfully")
                else:
                    version = await nm.get_cli_version()
                    job.add_log(f"CLI already installed (v{version})")
                
                # Step 5: Install node
                job.current_step = "Installing node"
                job.progress = 60
                job.add_log(f"Installing node '{request.node_name}'...")
                
                install_result = await nm.install_node(
                    name=request.node_name,
                    certificate=certificate,
                    service_port=request.service_port,
                    api_port=request.api_port,
                    method="docker",
                    inbounds=request.inbounds,
                )
                
                if not install_result.success:
                    raise ValueError(f"Installation failed: {install_result.error}")
                
                job.add_log("Node installed successfully")
                job.progress = 80
                
                # Step 6: Register node in Marzban
                job.current_step = "Registering node in Marzban"
                job.add_log("Registering node in Marzban panel...")
                
                node_id = await self._register_node(
                    panel_id=job.panel_id,
                    node_name=request.node_name,
                    address=install_result.public_ip or ssh_creds["host"],
                    service_port=install_result.service_port,
                    api_port=install_result.api_port,
                    ssh_profile_id=ssh_profile_id,
                    client_ip=client_ip,
                )
                
                job.add_log(f"Node registered with ID: {node_id}")
                job.progress = 100
                
                # Complete
                job.status = "completed"
                job.completed_at = datetime.utcnow()
                job.result = {
                    "node_id": node_id,
                    "node_name": request.node_name,
                    "address": install_result.public_ip or ssh_creds["host"],
                    "service_port": install_result.service_port,
                    "api_port": install_result.api_port,
                    "ssh_profile_id": ssh_profile_id,
                }
                
                job.add_log("Installation complete!")
                logger.info(f"Installation job {job.job_id} completed successfully")
                
        except Exception as e:
            job.status = "failed"
            job.completed_at = datetime.utcnow()
            job.error = str(e)
            job.add_log(f"Error: {e}")
            logger.error(f"Installation job {job.job_id} failed: {e}")
    
    async def _get_ssh_credentials(self, request: SSHInstallRequest) -> Dict[str, Any]:
        """Get SSH credentials from profile or request."""
        if request.ssh_profile_id:
            creds = self.ssh_profile_repo.get_decrypted_credentials(
                request.ssh_profile_id
            )
            if not creds:
                raise ValueError("SSH profile not found")
            return creds
        else:
            return {
                "host": request.ssh_host,
                "port": request.ssh_port,
                "username": request.ssh_username,
                "password": request.ssh_password,
                "private_key": request.ssh_private_key,
            }
    
    async def _get_or_create_ssh_profile(
        self, 
        request: SSHInstallRequest, 
        job: InstallJob
    ) -> int:
        """
        Get existing SSH profile ID or create a new one from inline credentials.
        
        Args:
            request: Installation request
            job: Install job for logging
            
        Returns:
            SSH profile ID
        """
        if request.ssh_profile_id:
            # Use existing profile
            job.add_log(f"Using existing SSH profile (ID: {request.ssh_profile_id})")
            return request.ssh_profile_id
        
        # Create a new SSH profile from inline credentials
        profile_name = f"SSH-{request.node_name}"
        
        # Check if profile name already exists, append suffix if needed
        existing = self.ssh_profile_repo.find_by_name(profile_name)
        if existing:
            # Append unique suffix
            suffix = str(uuid.uuid4())[:8]
            profile_name = f"SSH-{request.node_name}-{suffix}"
        
        job.add_log(f"Creating SSH profile: {profile_name}")
        
        profile = self.ssh_profile_repo.create_profile(
            profile_name=profile_name,
            host=request.ssh_host,
            port=request.ssh_port,
            username=request.ssh_username,
            password=request.ssh_password,
            private_key=request.ssh_private_key,
            use_key_auth=bool(request.ssh_private_key),
            default_service_port=request.service_port,
            default_api_port=request.api_port,
            install_docker=request.install_docker,
            auto_start_node=request.auto_start,
        )
        
        ssh_profile_id = profile["SSHProfileID"]
        job.add_log(f"SSH profile created (ID: {ssh_profile_id})")
        
        return ssh_profile_id
    
    async def _get_certificate(self, panel_id: int) -> Optional[str]:
        """Get certificate from panel."""
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            return None
        
        # Return cached certificate if available
        if panel.get("Certificate"):
            return panel["Certificate"]
        
        # Fetch from Marzban
        cred = self.credential_repo.find_by_panel_id(panel_id)
        if not cred:
            return None
        
        password = cred.get("Password")
        if not password:
            return None
        
        async with MarzbanClient(
            panel_url=panel["PanelURL"],
            username=cred["Username"],
            password=password,
        ) as client:
            settings = await client.get_node_settings()
            certificate = settings.get("certificate")
            
            if certificate:
                self.panel_repo.update_certificate(panel_id, certificate)
            
            return certificate
    
    async def _register_node(
        self,
        panel_id: int,
        node_name: str,
        address: str,
        service_port: int,
        api_port: int,
        ssh_profile_id: int = None,
        client_ip: str = None
    ) -> int:
        """Register node in Marzban and local DB."""
        # Create in local DB first
        node_data = {
            "MarzbanPanelID": panel_id,
            "NodeName": node_name,
            "Address": address,
            "ServicePort": service_port,
            "APIPort": api_port,
            "NodeStatusID": StatusEnum.CONNECTING,
        }
        
        # Include SSH profile ID if provided
        if ssh_profile_id:
            node_data["SSHProfileID"] = ssh_profile_id
        
        node = self.node_repo.insert(node_data)
        
        node_id = node["NodeID"]
        
        # Try to create in Marzban
        try:
            panel = self.panel_repo.find_by_id(panel_id)
            cred = self.credential_repo.find_by_panel_id(panel_id)
            
            if cred and cred.get("AccessToken"):
                async with MarzbanClient(
                    panel_url=panel["PanelURL"],
                    access_token=cred["AccessToken"]
                ) as client:
                    await client.create_node(
                        name=node_name,
                        address=address,
                        port=service_port,
                        api_port=api_port,
                    )
                    
                    # Update status to connected
                    self.node_repo.update_status(node_id, StatusEnum.CONNECTED)
                    
        except Exception as e:
            logger.warning(f"Failed to register node in Marzban: {e}")
            # Node is still in local DB, just not in Marzban yet
        
        # Audit log
        log_audit(
            self.db,
            entity_type="Node",
            entity_id=node_id,
            action_type="SSH_INSTALL",
            description=f"Installed node '{node_name}' via SSH",
            new_value={"address": address, "ports": f"{service_port}/{api_port}"},
            performed_by_ip=client_ip,
        )
        
        return node_id
