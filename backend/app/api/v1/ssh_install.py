"""
SSH Installation Endpoints.

Provides endpoints for tracking SSH installation job status.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.common import APIResponse
from app.schemas.ssh_install import SSHInstallJobResponse
from app.services.job_manager import get_job_manager, JobManager, JobStatus

router = APIRouter()


def get_job_manager_dep() -> JobManager:
    """Get JobManager dependency."""
    return get_job_manager()


@router.get("/{job_id}/status", response_model=APIResponse[dict])
async def get_ssh_install_status(
    job_id: str,
    job_manager: JobManager = Depends(get_job_manager_dep)
):
    """
    Get SSH installation job status.

    Returns the current status, progress, and logs of an SSH installation job.
    """
    status = await job_manager.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    # Map to frontend expected format
    return APIResponse(success=True, data={
        "job_id": status["job_id"],
        "status": status["status"],
        "progress": status["progress"],
        "logs": status["logs"],
        "result": status.get("result"),
        "error": status.get("error"),
    })


@router.get("", response_model=APIResponse[list])
async def list_ssh_install_jobs(
    status: Optional[str] = None,
    limit: int = 50,
    job_manager: JobManager = Depends(get_job_manager_dep)
):
    """
    List SSH installation jobs.

    Optional filters:
    - status: Filter by job status (pending, running, completed, failed)
    - limit: Maximum number of jobs to return (default 50)
    """
    # Convert status string to enum if provided
    status_enum = None
    if status:
        try:
            status_enum = JobStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid status: {status}")

    jobs = await job_manager.list_jobs(
        job_type="ssh_install",
        status=status_enum,
        limit=limit
    )

    return APIResponse(success=True, data=jobs)


@router.post("/{job_id}/cancel", response_model=APIResponse[dict])
async def cancel_ssh_install_job(
    job_id: str,
    job_manager: JobManager = Depends(get_job_manager_dep)
):
    """
    Cancel a running SSH installation job.
    """
    success = await job_manager.cancel_job(job_id)
    if not success:
        job = await job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        raise HTTPException(status_code=400, detail="Job cannot be cancelled")

    return APIResponse(success=True, data={"message": "Job cancelled"})
