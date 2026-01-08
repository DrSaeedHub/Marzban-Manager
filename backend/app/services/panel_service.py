"""
Panel Service.

Business logic for panel management operations.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.db.connection import DatabaseConnection
from app.repositories.panel_repo import PanelRepository, PanelCredentialRepository
from app.repositories.node_repo import NodeRepository
from app.repositories.snapshot_repo import SnapshotRepository
from app.repositories.ssh_profile_repo import SSHProfileRepository
from app.repositories.audit_repo import log_audit
from app.clients.marzban_client import MarzbanClient, MarzbanClientError
from app.clients.ssh_client import SSHClient
from app.clients.node_manager_client import NodeManagerClient
from app.schemas.common import StatusEnum
from app.schemas.panel import (
    PanelCreate,
    PanelUpdate,
    PanelResponse,
    ConnectionTestResponse,
    CertificateResponse,
    TestConnectionRequest,
    UpdateCredentialsRequest,
    DisconnectResponse,
    RestartXrayCoreResponse,
)
from app.schemas.ssh_install import SSHInstallRequest
from app.services.job_manager import get_job_manager, Job

logger = logging.getLogger(__name__)


class PanelService:
    """Service for panel management operations."""

    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.panel_repo = PanelRepository(db)
        self.credential_repo = PanelCredentialRepository(db)
        self.node_repo = NodeRepository(db)
        self.snapshot_repo = SnapshotRepository(db)
        self.ssh_profile_repo = SSHProfileRepository(db)

    def _to_response(self, panel: Dict[str, Any], password: Optional[str] = None) -> PanelResponse:
        """Convert database record to response model."""
        return PanelResponse(
            id=panel["MarzbanPanelID"],
            name=panel["PanelName"],
            url=panel["PanelURL"],
            username=panel.get("Username"),
            password=password,
            status=StatusEnum.to_string(panel["PanelStatusID"]),
            status_message=panel.get("StatusMessage"),
            node_count=panel.get("node_count", 0),
            certificate=panel.get("Certificate"),
            last_sync=panel.get("LastSyncDate"),
            created_at=panel["CreatedDate"],
            updated_at=panel.get("UpdatedDate"),
        )

    async def list_panels(self) -> List[PanelResponse]:
        """Get all panels with node counts."""
        panels = self.panel_repo.find_all_with_node_count()
        return [self._to_response(p, p.get("Password")) for p in panels]

    async def get_panel(self, panel_id: int) -> Optional[PanelResponse]:
        """Get panel by ID with details."""
        panel = self.panel_repo.find_by_id_with_details(panel_id)
        if not panel:
            return None
        # Get password from panel data
        password = panel.get("Password")
        return self._to_response(panel, password)

    async def create_panel(
        self,
        data: PanelCreate,
        client_ip: str = None
    ) -> PanelResponse:
        """
        Create a new panel.

        Args:
            data: Panel creation data
            client_ip: Client IP for audit logging

        Returns:
            Created panel response
        """
        # Check for duplicate name
        if self.panel_repo.find_by_name(data.name):
            raise ValueError(f"Panel with name '{data.name}' already exists")

        # Check for duplicate URL
        if self.panel_repo.find_by_url(data.url):
            raise ValueError(f"Panel with URL '{data.url}' already exists")

        # Create panel record
        panel = self.panel_repo.insert({
            "PanelName": data.name,
            "PanelURL": data.url,
            "PanelStatusID": StatusEnum.CONNECTING,
        })

        panel_id = panel["MarzbanPanelID"]

        # Create credentials
        self.credential_repo.create_for_panel(
            panel_id=panel_id,
            username=data.username,
            password=data.password,
        )

        # Audit log
        log_audit(
            self.db,
            entity_type="Panel",
            entity_id=panel_id,
            action_type="CREATE",
            description=f"Created panel '{data.name}'",
            new_value={"name": data.name, "url": data.url},
            performed_by_ip=client_ip,
        )

        logger.info(f"Created panel: {data.name} ({panel_id})")

        # Immediately connect to Marzban panel, get token and certificate
        await self._connect_and_fetch_certificate(panel_id, data.url, data.username, data.password)

        # Return with details
        return await self.get_panel(panel_id)

    async def update_panel(
        self,
        panel_id: int,
        data: PanelUpdate,
        client_ip: str = None
    ) -> Optional[PanelResponse]:
        """Update panel details."""
        # Get existing panel
        existing = self.panel_repo.find_by_id(panel_id)
        if not existing:
            return None

        old_values = {
            "name": existing["PanelName"],
            "url": existing["PanelURL"],
        }

        # Build update data
        update_data = {}
        if data.name and data.name != existing["PanelName"]:
            # Check for duplicate name
            if self.panel_repo.find_by_name(data.name):
                raise ValueError(
                    f"Panel with name '{data.name}' already exists")
            update_data["PanelName"] = data.name

        if data.url and data.url != existing["PanelURL"]:
            # Check for duplicate URL
            if self.panel_repo.find_by_url(data.url):
                raise ValueError(f"Panel with URL '{data.url}' already exists")
            update_data["PanelURL"] = data.url

        # Update panel if there are changes
        if update_data:
            self.panel_repo.update(panel_id, update_data)

        # Update credentials if provided
        if data.username:
            self.credential_repo.update_where(
                {"MarzbanPanelID": panel_id},
                {"Username": data.username}
            )

        if data.password:
            self.credential_repo.update_password(panel_id, data.password)

        # Audit log
        if update_data or data.username or data.password:
            log_audit(
                self.db,
                entity_type="Panel",
                entity_id=panel_id,
                action_type="UPDATE",
                description=f"Updated panel '{existing['PanelName']}'",
                old_value=old_values,
                new_value={
                    "name": data.name or old_values["name"], "url": data.url or old_values["url"]},
                performed_by_ip=client_ip,
            )

        logger.info(f"Updated panel: {panel_id}")
        return await self.get_panel(panel_id)

    async def delete_panel(
        self,
        panel_id: int,
        client_ip: str = None
    ) -> bool:
        """Soft delete a panel."""
        existing = self.panel_repo.find_by_id(panel_id)
        if not existing:
            return False

        success = self.panel_repo.delete(panel_id)

        if success:
            log_audit(
                self.db,
                entity_type="Panel",
                entity_id=panel_id,
                action_type="DELETE",
                description=f"Deleted panel '{existing['PanelName']}'",
                old_value={"name": existing["PanelName"],
                           "url": existing["PanelURL"]},
                performed_by_ip=client_ip,
            )
            logger.info(f"Deleted panel: {panel_id}")

        return success

    async def test_connection(self, panel_id: int) -> ConnectionTestResponse:
        """Test connection to panel, authenticate, and fetch certificate."""
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")

        # Get credentials
        cred = self.credential_repo.find_by_panel_id(panel_id)
        password = cred.get("Password") if cred else None

        if not cred or not password:
            return ConnectionTestResponse(
                connected=False,
                error="No credentials configured"
            )

        # Connect and fetch certificate
        return await self._connect_and_fetch_certificate(
            panel_id,
            panel["PanelURL"],
            cred["Username"],
            password
        )

    async def reconnect(self, panel_id: int) -> ConnectionTestResponse:
        """Re-authenticate, refresh token, and fetch certificate."""
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")

        cred = self.credential_repo.find_by_panel_id(panel_id)
        if not cred:
            return ConnectionTestResponse(
                connected=False,
                error="No credentials configured"
            )

        password = cred.get("Password")
        if not password:
            return ConnectionTestResponse(
                connected=False,
                error="No password configured"
            )

        # Connect and fetch certificate
        return await self._connect_and_fetch_certificate(
            panel_id,
            panel["PanelURL"],
            cred["Username"],
            password
        )

    async def _connect_and_fetch_certificate(
        self,
        panel_id: int,
        url: str,
        username: str,
        password: str
    ) -> ConnectionTestResponse:
        """
        Connect to Marzban panel, get access token, and fetch certificate.

        Args:
            panel_id: Panel ID
            url: Panel URL
            username: Admin username
            password: Admin password

        Returns:
            ConnectionTestResponse with connection status
        """
        try:
            async with MarzbanClient(
                panel_url=url,
                username=username,
                password=password,
            ) as client:
                # Test connection and authenticate
                result = await client.test_connection()

                if result.get("connected"):
                    # Update status to connected
                    self.panel_repo.update_status(
                        panel_id, StatusEnum.CONNECTED)

                    # Store access token
                    self.credential_repo.update_token(
                        panel_id,
                        client.token,
                        client.token_expires_at
                    )

                    logger.info(f"Panel {panel_id} connected, token stored")

                    # Fetch and store certificate
                    try:
                        settings = await client.get_node_settings()
                        certificate = settings.get("certificate")

                        if certificate:
                            self.panel_repo.update_certificate(
                                panel_id, certificate)
                            logger.info(f"Panel {panel_id} certificate stored")
                    except Exception as cert_error:
                        logger.warning(
                            f"Failed to fetch certificate for panel {panel_id}: {cert_error}")

                    return ConnectionTestResponse(
                        connected=True,
                        admin_username=result.get("admin_username"),
                        panel_version=result.get("version")
                    )
                else:
                    self.panel_repo.update_status(
                        panel_id,
                        StatusEnum.ERROR,
                        result.get("error", "Connection failed")
                    )
                    return ConnectionTestResponse(
                        connected=False,
                        error=result.get("error", "Connection failed")
                    )

        except MarzbanClientError as e:
            self.panel_repo.update_status(panel_id, StatusEnum.ERROR, str(e))
            logger.error(f"Panel {panel_id} connection failed: {e}")
            return ConnectionTestResponse(connected=False, error=str(e))
        except Exception as e:
            self.panel_repo.update_status(panel_id, StatusEnum.ERROR, str(e))
            logger.error(f"Panel {panel_id} unexpected error: {e}")
            return ConnectionTestResponse(connected=False, error=str(e))

    async def get_certificate(self, panel_id: int) -> CertificateResponse:
        """Fetch node certificate from Marzban panel."""
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")

        # Check if we have a stored certificate
        if panel.get("Certificate"):
            return CertificateResponse(certificate=panel["Certificate"])

        # Fetch from Marzban
        client = await self._get_client(panel_id)
        if not client:
            raise ValueError("Cannot connect to panel")

        async with client:
            settings = await client.get_node_settings()
            certificate = settings.get("certificate")

            if certificate:
                # Store certificate
                self.panel_repo.update_certificate(panel_id, certificate)

            return CertificateResponse(certificate=certificate)

    async def _get_client(self, panel_id: int) -> Optional[MarzbanClient]:
        """Get authenticated Marzban client for panel."""
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            return None

        cred = self.credential_repo.find_by_panel_id(panel_id)
        if not cred:
            return None

        # Try using existing token first
        if cred.get("AccessToken"):
            return MarzbanClient(
                panel_url=panel["PanelURL"],
                access_token=cred["AccessToken"]
            )

        # Fall back to password auth
        password = cred.get("Password")
        if not password:
            return None

        return MarzbanClient(
            panel_url=panel["PanelURL"],
            username=cred["Username"],
            password=password
        )

    async def get_xray_config(self, panel_id: int) -> Dict[str, Any]:
        """Get current Xray configuration from panel."""
        client = await self._get_client(panel_id)
        if not client:
            raise ValueError("Cannot connect to panel")

        async with client:
            config = await client.get_core_config()
            return {
                "config": config,
                "last_modified": datetime.utcnow().isoformat()
            }

    async def update_xray_config(
        self,
        panel_id: int,
        config: dict,
        snapshot_reason: str = None,
        client_ip: str = None
    ) -> Dict[str, Any]:
        """Update Xray configuration on panel."""
        # Get current config for snapshot
        client = await self._get_client(panel_id)
        if not client:
            raise ValueError("Cannot connect to panel")

        async with client:
            old_config = await client.get_core_config()

            # Create snapshot before update
            snapshot = self.snapshot_repo.create_snapshot(
                panel_id=panel_id,
                config=old_config,
                reason=snapshot_reason or "Before config update"
            )

            # Update config
            new_config = await client.update_core_config(config)

            # Audit log
            log_audit(
                self.db,
                entity_type="Panel",
                entity_id=panel_id,
                action_type="CONFIG_UPDATE",
                description=snapshot_reason or "Updated Xray configuration",
                performed_by_ip=client_ip,
            )

            return {
                "config": new_config,
                "snapshot_id": snapshot["PanelConfigSnapshotID"]
            }

    async def list_config_snapshots(self, panel_id: int) -> List[Dict[str, Any]]:
        """List configuration snapshots for panel."""
        snapshots = self.snapshot_repo.find_by_panel_id(panel_id)
        return [
            {
                "id": s["PanelConfigSnapshotID"],
                "reason": s.get("SnapshotReason"),
                "created_at": s["CreatedDate"].isoformat(),
            }
            for s in snapshots
        ]

    async def restore_config_snapshot(
        self,
        panel_id: int,
        snapshot_id: int,
        client_ip: str = None
    ) -> Dict[str, Any]:
        """Restore configuration from snapshot."""
        snapshot = self.snapshot_repo.find_by_id(snapshot_id)
        if not snapshot or snapshot["MarzbanPanelID"] != panel_id:
            raise ValueError("Snapshot not found")

        # Parse config from snapshot
        import json
        config = json.loads(snapshot["ConfigJSON"])

        return await self.update_xray_config(
            panel_id,
            config,
            f"Restored from snapshot {snapshot_id}",
            client_ip
        )

    async def list_panel_nodes(self, panel_id: int, sync_status: bool = True) -> List[Dict[str, Any]]:
        """
        List nodes for a specific panel.

        Args:
            panel_id: Panel ID
            sync_status: If True, sync statuses from Marzban panel first
        """
        # Optionally sync statuses from Marzban before returning
        if sync_status:
            try:
                await self.sync_node_statuses(panel_id)
            except Exception as e:
                logger.warning(f"Failed to sync node statuses: {e}")

        nodes = self.node_repo.find_by_panel_id(panel_id)
        return [
            {
                "id": n["NodeID"],
                "name": n["NodeName"],
                "address": n["Address"],
                "service_port": n["ServicePort"],
                "api_port": n["APIPort"],
                "status": n.get("status_name", "connecting"),
                "xray_version": n.get("XrayVersion"),
                "usage_coefficient": float(n["UsageCoefficient"]),
                "uplink": n["Uplink"],
                "downlink": n["Downlink"],
                "assigned_templates": n.get("assigned_templates", []),
                "ssh_profile_id": n.get("SSHProfileID"),
            }
            for n in nodes
        ]

    async def sync_node_statuses(self, panel_id: int) -> Dict[str, Any]:
        """
        Sync node statuses from Marzban panel API.

        Fetches the current node status from Marzban and updates local DB.

        Args:
            panel_id: Panel ID to sync nodes for

        Returns:
            Dict with sync results (updated count, errors)
        """
        client = await self._get_client(panel_id)
        if not client:
            logger.warning(
                f"Cannot sync nodes: no client for panel {panel_id}")
            return {"updated": 0, "error": "Cannot connect to panel"}

        updated_count = 0
        errors = []

        try:
            async with client:
                # Fetch nodes from Marzban
                marzban_nodes = await client.get_nodes()

                # Get local nodes for this panel
                local_nodes = self.node_repo.find_by_panel_id(panel_id)

                # Create lookup by name and by marzban_node_id
                marzban_by_name = {
                    n.get("name", "").lower(): n for n in marzban_nodes}
                marzban_by_id = {n.get("id"): n for n in marzban_nodes}

                for local_node in local_nodes:
                    try:
                        # Try to match by marzban_node_id first, then by name
                        marzban_node = None
                        if local_node.get("MarzbanNodeID"):
                            marzban_node = marzban_by_id.get(
                                local_node["MarzbanNodeID"])

                        if not marzban_node:
                            # Fallback to name matching
                            marzban_node = marzban_by_name.get(
                                local_node["NodeName"].lower())

                        if marzban_node:
                            # Map Marzban status to our status
                            marzban_status = marzban_node.get(
                                "status", "").lower()
                            xray_version = marzban_node.get("xray_version")

                            # Determine status ID
                            if marzban_status == "connected":
                                status_id = StatusEnum.CONNECTED
                            elif marzban_status == "connecting":
                                status_id = StatusEnum.CONNECTING
                            elif marzban_status == "error":
                                status_id = StatusEnum.ERROR
                            elif marzban_status == "disabled":
                                status_id = StatusEnum.DISABLED
                            else:
                                status_id = StatusEnum.CONNECTING

                            # Update local node status and xray version
                            update_data = {"NodeStatusID": status_id}
                            if xray_version:
                                update_data["XrayVersion"] = xray_version

                            self.node_repo.update(
                                local_node["NodeID"], update_data)
                            updated_count += 1
                            logger.debug(
                                f"Synced node {local_node['NodeName']}: status={marzban_status}")
                        else:
                            logger.debug(
                                f"Node {local_node['NodeName']} not found in Marzban")

                    except Exception as e:
                        errors.append(
                            f"Error syncing node {local_node['NodeName']}: {e}")
                        logger.error(
                            f"Error syncing node {local_node['NodeName']}: {e}")

        except Exception as e:
            logger.error(f"Failed to fetch nodes from Marzban: {e}")
            return {"updated": 0, "error": str(e)}

        result = {"updated": updated_count}
        if errors:
            result["errors"] = errors

        logger.info(
            f"Synced {updated_count} node statuses for panel {panel_id}")
        return result

    async def create_node(
        self,
        panel_id: int,
        node_data: dict,
        client_ip: str = None
    ) -> Dict[str, Any]:
        """Register a new node in the panel."""
        # Create in Marzban first
        client = await self._get_client(panel_id)
        if not client:
            raise ValueError("Cannot connect to panel")

        async with client:
            marzban_node = await client.create_node(
                name=node_data["name"],
                address=node_data["address"],
                port=node_data.get("service_port", 62050),
                api_port=node_data.get("api_port", 62051),
                usage_coefficient=node_data.get("usage_coefficient", 1.0),
                add_as_new_host=node_data.get("add_as_new_host", True)
            )

        # Store locally
        node = self.node_repo.insert({
            "MarzbanPanelID": panel_id,
            "NodeName": node_data["name"],
            "Address": node_data["address"],
            "ServicePort": node_data.get("service_port", 62050),
            "APIPort": node_data.get("api_port", 62051),
            "UsageCoefficient": node_data.get("usage_coefficient", 1.0),
            "NodeStatusID": StatusEnum.CONNECTING,
        })

        log_audit(
            self.db,
            entity_type="Node",
            entity_id=node["NodeID"],
            action_type="CREATE",
            description=f"Created node '{node_data['name']}'",
            new_value=node_data,
            performed_by_ip=client_ip,
        )

        return {
            "id": node["NodeID"],
            "marzban_node_id": marzban_node.get("id"),
            **node_data,
            "status": "connecting"
        }

    async def start_ssh_install(
        self,
        panel_id: int,
        install_request: dict,
        client_ip: str = None
    ) -> Dict[str, Any]:
        """
        Start SSH installation of a node (returns job ID).

        Args:
            panel_id: Panel to install node for
            install_request: Installation request data
            client_ip: Client IP for audit logging

        Returns:
            Dict with job_id, status, and message
        """
        # Validate panel exists
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")

        # Parse and validate request
        try:
            request = SSHInstallRequest(**install_request)
        except Exception as e:
            raise ValueError(f"Invalid request: {e}")

        # IMPORTANT: Gather ALL data needed for background task NOW,
        # before the HTTP request ends and DB connection closes

        # Get SSH credentials
        ssh_creds = await self._get_ssh_credentials_for_install(request)

        # Get or create SSH profile (must be done before background task starts)
        ssh_profile_id = self._get_or_create_ssh_profile_for_install(request)

        # Get certificate
        certificate = await self._get_certificate_for_install(panel_id)
        if not certificate:
            raise ValueError("Failed to fetch certificate from panel")

        # Get panel info for Marzban registration
        panel_url = panel["PanelURL"]
        cred = self.credential_repo.find_by_panel_id(panel_id)
        access_token = cred.get("AccessToken") if cred else None

        # Get job manager
        job_manager = get_job_manager()

        # Create job
        job = await job_manager.create_job(
            job_type="ssh_install",
            metadata={
                "panel_id": panel_id,
                "node_name": request.node_name,
                "ssh_host": request.ssh_host,
            }
        )

        # Define the installation task with pre-fetched data
        async def ssh_install_task(job: Job) -> None:
            """Run SSH installation as background task."""
            await self._run_ssh_installation(
                job=job,
                panel_id=panel_id,
                request=request,
                ssh_creds=ssh_creds,
                certificate=certificate,
                panel_url=panel_url,
                access_token=access_token,
                ssh_profile_id=ssh_profile_id,
                client_ip=client_ip,
            )

        # Run job in background
        await job_manager.run_job(job, ssh_install_task)

        logger.info(
            f"Started SSH installation job: {job.job_id} for panel {panel_id}")

        return {
            "job_id": job.job_id,
            "status": "pending",
            "message": "Installation job queued"
        }

    async def _run_ssh_installation(
        self,
        job: Job,
        panel_id: int,
        request: SSHInstallRequest,
        ssh_creds: Dict[str, Any],
        certificate: str,
        panel_url: str,
        access_token: Optional[str],
        ssh_profile_id: int,
        client_ip: str = None
    ) -> None:
        """
        Run the SSH installation process (background task).

        NOTE: This runs as a background task after the HTTP request completes.
        All database-dependent data must be passed in, not fetched via self.db.

        Args:
            job: Job instance for progress tracking
            panel_id: Panel ID
            request: Installation request
            ssh_creds: Pre-fetched SSH credentials
            certificate: Pre-fetched panel certificate
            panel_url: Panel URL for Marzban API
            access_token: Access token for Marzban API
            ssh_profile_id: SSH profile ID for linking to node
            client_ip: Client IP for audit
        """
        try:
            # Step 1: SSH credentials already prepared
            job.update_progress(5, "Preparing SSH credentials")
            job.add_log("Preparing SSH credentials...")
            job.add_log("SSH credentials ready")

            # Step 2: Certificate already fetched
            job.update_progress(10, "Fetching certificate")
            job.add_log("Fetching certificate from panel...")
            job.add_log("Certificate fetched successfully")

            # Step 3: Connect via SSH
            job.update_progress(20, "Connecting to server")
            job.add_log(
                f"Connecting to {ssh_creds['host']}:{ssh_creds['port']}...")

            async with SSHClient(
                host=ssh_creds["host"],
                port=ssh_creds["port"],
                username=ssh_creds["username"],
                password=ssh_creds.get("password"),
                private_key=ssh_creds.get("private_key"),
            ) as ssh:
                job.add_log(f"Connected to {ssh_creds['host']}")

                # Step 4: Check/install CLI
                job.update_progress(30, "Checking node-manager CLI")

                nm = NodeManagerClient(ssh)

                if not await nm.is_cli_installed():
                    job.add_log("Installing node-manager CLI...")
                    job.update_progress(40, "Installing CLI")

                    if not await nm.install_cli():
                        raise ValueError("Failed to install node-manager CLI")

                    job.add_log("CLI installed successfully")
                else:
                    version = await nm.get_cli_version()
                    job.add_log(f"CLI already installed (v{version})")

                # Step 5: Install node
                job.update_progress(60, "Installing node")

                if request.auto_ports:
                    job.add_log(
                        f"Installing node '{request.node_name}' with auto-assigned ports...")
                else:
                    job.add_log(
                        f"Installing node '{request.node_name}' on ports {request.service_port}/{request.api_port}...")

                install_result = await nm.install_node(
                    name=request.node_name,
                    certificate=certificate,
                    service_port=request.service_port,
                    api_port=request.api_port,
                    method="docker",
                    inbounds=request.inbounds,
                    auto_ports=request.auto_ports,
                )

                if not install_result.success:
                    raise ValueError(
                        f"Installation failed: {install_result.error}")

                # Use actual ports from install result (important for auto_ports mode)
                actual_service_port = install_result.service_port
                actual_api_port = install_result.api_port

                if request.auto_ports:
                    job.add_log(
                        f"Node installed with auto-assigned ports: {actual_service_port}/{actual_api_port}")
                else:
                    job.add_log("Node installed successfully")

                job.update_progress(80, "Registering node in Marzban")

                # Step 6: Register node in Marzban
                job.add_log("Registering node in Marzban panel...")

                # Create new DB connection for this operation (original is closed)
                # Use actual ports from install result (not requested ports)
                node_id = await self._register_node_after_install_background(
                    panel_id=panel_id,
                    node_name=request.node_name,
                    address=install_result.public_ip or ssh_creds["host"],
                    service_port=actual_service_port,
                    api_port=actual_api_port,
                    panel_url=panel_url,
                    access_token=access_token,
                    ssh_profile_id=ssh_profile_id,
                    client_ip=client_ip,
                )

                job.add_log(f"Node registered with ID: {node_id}")

                # Complete - return actual ports used
                job.complete({
                    "node_id": node_id,
                    "node_name": request.node_name,
                    "address": install_result.public_ip or ssh_creds["host"],
                    "service_port": actual_service_port,
                    "api_port": actual_api_port,
                    "auto_ports_used": request.auto_ports,
                    "ssh_profile_id": ssh_profile_id,
                })

                job.add_log("Installation complete!")
                logger.info(
                    f"Installation job {job.job_id} completed successfully")

        except Exception as e:
            job.fail(str(e))
            job.add_log(f"Error: {e}")
            logger.error(f"Installation job {job.job_id} failed: {e}")
            raise

    async def _get_ssh_credentials_for_install(self, request: SSHInstallRequest) -> Dict[str, Any]:
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
    
    def _get_or_create_ssh_profile_for_install(self, request: SSHInstallRequest) -> int:
        """
        Get existing SSH profile ID or create a new one from inline credentials.
        
        Args:
            request: Installation request
            
        Returns:
            SSH profile ID
        """
        import uuid as uuid_module
        
        if request.ssh_profile_id:
            # Use existing profile
            return request.ssh_profile_id
        
        # Create a new SSH profile from inline credentials
        profile_name = f"SSH-{request.node_name}"
        
        # Check if profile name already exists, append suffix if needed
        existing = self.ssh_profile_repo.find_by_name(profile_name)
        if existing:
            # Append unique suffix
            suffix = str(uuid_module.uuid4())[:8]
            profile_name = f"SSH-{request.node_name}-{suffix}"
        
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
        
        return profile["SSHProfileID"]

    async def _get_certificate_for_install(self, panel_id: int) -> Optional[str]:
        """Get certificate from panel for installation."""
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

        try:
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
        except Exception as e:
            logger.error(f"Failed to fetch certificate: {e}")
            return None

    async def _register_node_after_install(
        self,
        panel_id: int,
        node_name: str,
        address: str,
        service_port: int,
        api_port: int,
        client_ip: str = None
    ) -> int:
        """Register node in Marzban and local DB after installation."""
        # Create in local DB first
        node = self.node_repo.insert({
            "MarzbanPanelID": panel_id,
            "NodeName": node_name,
            "Address": address,
            "ServicePort": service_port,
            "APIPort": api_port,
            "NodeStatusID": StatusEnum.CONNECTING,
        })

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
            new_value={"address": address,
                       "ports": f"{service_port}/{api_port}"},
            performed_by_ip=client_ip,
        )

        return node_id

    async def _register_node_after_install_background(
        self,
        panel_id: int,
        node_name: str,
        address: str,
        service_port: int,
        api_port: int,
        panel_url: str,
        access_token: Optional[str],
        ssh_profile_id: int = None,
        client_ip: str = None
    ) -> int:
        """
        Register node in Marzban and local DB (for background task).

        Creates its own database connection since this runs after the
        original HTTP request has completed.
        """
        # Create NEW database connection for background task
        with DatabaseConnection() as db:
            node_repo = NodeRepository(db)

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
            
            node = node_repo.insert(node_data)

            node_id = node["NodeID"]

            # Try to create in Marzban
            try:
                if access_token:
                    async with MarzbanClient(
                        panel_url=panel_url,
                        access_token=access_token
                    ) as client:
                        await client.create_node(
                            name=node_name,
                            address=address,
                            port=service_port,
                            api_port=api_port,
                        )

                        # Update status to connected
                        node_repo.update_status(node_id, StatusEnum.CONNECTED)

            except Exception as e:
                logger.warning(f"Failed to register node in Marzban: {e}")
                # Node is still in local DB, just not in Marzban yet

            # Audit log
            log_audit(
                db,
                entity_type="Node",
                entity_id=node_id,
                action_type="SSH_INSTALL",
                description=f"Installed node '{node_name}' via SSH",
                new_value={"address": address,
                           "ports": f"{service_port}/{api_port}"},
                performed_by_ip=client_ip,
            )

        return node_id

    async def test_connection_anonymous(
        self,
        url: str,
        username: str,
        password: str
    ) -> ConnectionTestResponse:
        """
        Test connection to a Marzban panel without requiring an existing panel.

        Args:
            url: Panel URL
            username: Admin username
            password: Admin password

        Returns:
            ConnectionTestResponse with connection status
        """
        try:
            async with MarzbanClient(
                panel_url=url,
                username=username,
                password=password,
            ) as client:
                result = await client.test_connection()

                if result.get("connected"):
                    return ConnectionTestResponse(
                        connected=True,
                        admin_username=result.get("admin_username"),
                        panel_version=result.get("version")
                    )
                else:
                    return ConnectionTestResponse(
                        connected=False,
                        error=result.get("error", "Connection failed")
                    )

        except MarzbanClientError as e:
            return ConnectionTestResponse(connected=False, error=str(e))
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return ConnectionTestResponse(connected=False, error=str(e))

    async def disconnect(
        self,
        panel_id: int,
        client_ip: str = None
    ) -> DisconnectResponse:
        """
        Disconnect from a panel (clear token, set status to disabled).

        Args:
            panel_id: Panel ID
            client_ip: Client IP for audit logging

        Returns:
            DisconnectResponse with status
        """
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")

        # Clear access token
        self.credential_repo.update_where(
            {"MarzbanPanelID": panel_id},
            {"AccessToken": None, "TokenExpiresAt": None}
        )

        # Update status to disabled
        self.panel_repo.update_status(
            panel_id, StatusEnum.DISABLED, "Disconnected by user")

        # Audit log
        log_audit(
            self.db,
            entity_type="Panel",
            entity_id=panel_id,
            action_type="DISCONNECT",
            description=f"Disconnected panel '{panel['PanelName']}'",
            performed_by_ip=client_ip,
        )

        logger.info(f"Disconnected panel: {panel_id}")

        return DisconnectResponse(success=True, message="Panel disconnected successfully")

    async def update_credentials(
        self,
        panel_id: int,
        request: UpdateCredentialsRequest,
        client_ip: str = None
    ) -> ConnectionTestResponse:
        """
        Update panel credentials and reconnect.

        Args:
            panel_id: Panel ID
            request: Credentials update request
            client_ip: Client IP for audit logging

        Returns:
            ConnectionTestResponse with connection status
        """
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")

        # Update username if provided
        if request.username:
            self.credential_repo.update_where(
                {"MarzbanPanelID": panel_id},
                {"Username": request.username}
            )

        # Update password
        self.credential_repo.update_password(panel_id, request.password)

        # Clear old token
        self.credential_repo.update_where(
            {"MarzbanPanelID": panel_id},
            {"AccessToken": None, "TokenExpiresAt": None}
        )

        # Audit log
        log_audit(
            self.db,
            entity_type="Panel",
            entity_id=panel_id,
            action_type="CREDENTIALS_UPDATE",
            description=f"Updated credentials for panel '{panel['PanelName']}'",
            performed_by_ip=client_ip,
        )

        logger.info(f"Updated credentials for panel: {panel_id}")

        # Test connection with new credentials
        return await self.test_connection(panel_id)

    async def restart_xray_core(
        self,
        panel_id: int,
        client_ip: str = None
    ) -> RestartXrayCoreResponse:
        """
        Restart Xray core on the panel.

        Args:
            panel_id: Panel ID
            client_ip: Client IP for audit logging

        Returns:
            RestartXrayCoreResponse with status
        """
        panel = self.panel_repo.find_by_id(panel_id)
        if not panel:
            raise ValueError("Panel not found")

        client = await self._get_client(panel_id)
        if not client:
            raise ValueError("Cannot connect to panel")

        try:
            async with client:
                await client.restart_core()

                # Audit log
                log_audit(
                    self.db,
                    entity_type="Panel",
                    entity_id=panel_id,
                    action_type="XRAY_RESTART",
                    description=f"Restarted Xray core on panel '{panel['PanelName']}'",
                    performed_by_ip=client_ip,
                )

                logger.info(f"Restarted Xray core on panel: {panel_id}")

                return RestartXrayCoreResponse(
                    success=True,
                    message="Xray core restarted successfully"
                )

        except MarzbanClientError as e:
            logger.error(f"Failed to restart Xray core: {e}")
            return RestartXrayCoreResponse(
                success=False,
                message=f"Failed to restart Xray core: {e}"
            )
