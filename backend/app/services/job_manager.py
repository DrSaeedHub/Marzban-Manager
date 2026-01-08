"""
Background Job Manager.

Manages background jobs with progress tracking, particularly for SSH installations.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable, Awaitable
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Job status enum."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Job:
    """Represents a background job."""
    job_id: str
    job_type: str
    status: JobStatus = JobStatus.PENDING
    progress: int = 0
    current_step: str = ""
    logs: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    
    def add_log(self, message: str) -> None:
        """Add a log message with timestamp."""
        timestamp = datetime.utcnow().isoformat()
        log_entry = f"[{timestamp}] {message}"
        self.logs.append(log_entry)
        logger.debug(f"[{self.job_id}] {message}")
    
    def update_progress(self, progress: int, step: str = None) -> None:
        """Update job progress."""
        self.progress = min(max(progress, 0), 100)
        if step:
            self.current_step = step
    
    def start(self) -> None:
        """Mark job as started."""
        self.status = JobStatus.RUNNING
        self.started_at = datetime.utcnow()
        self.add_log("Job started")
    
    def complete(self, result: Dict[str, Any] = None) -> None:
        """Mark job as completed."""
        self.status = JobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress = 100
        self.result = result
        self.add_log("Job completed successfully")
    
    def fail(self, error: str) -> None:
        """Mark job as failed."""
        self.status = JobStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error = error
        self.add_log(f"Job failed: {error}")
    
    def cancel(self) -> None:
        """Mark job as cancelled."""
        self.status = JobStatus.CANCELLED
        self.completed_at = datetime.utcnow()
        self.add_log("Job cancelled")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary."""
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "status": self.status.value,
            "progress": self.progress,
            "current_step": self.current_step,
            "logs": self.logs,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "result": self.result,
        }


class JobManager:
    """
    Manages background jobs with progress tracking.
    
    Features:
    - Job creation and tracking
    - Progress updates
    - Log collection
    - Result/error handling
    - Job cleanup (expired jobs)
    """
    
    def __init__(self, max_jobs: int = 1000, job_ttl_hours: int = 24):
        """
        Initialize JobManager.
        
        Args:
            max_jobs: Maximum number of jobs to keep in memory
            job_ttl_hours: Hours to keep completed jobs before cleanup
        """
        self._jobs: Dict[str, Job] = {}
        self._max_jobs = max_jobs
        self._job_ttl_hours = job_ttl_hours
        self._tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
    
    async def create_job(
        self,
        job_type: str,
        metadata: Dict[str, Any] = None,
        job_id: str = None
    ) -> Job:
        """
        Create a new job.
        
        Args:
            job_type: Type of job (e.g., "ssh_install")
            metadata: Additional metadata for the job
            job_id: Optional custom job ID
            
        Returns:
            Created Job instance
        """
        async with self._lock:
            # Cleanup if at capacity
            if len(self._jobs) >= self._max_jobs:
                await self._cleanup_old_jobs()
            
            # Create job
            job = Job(
                job_id=job_id or str(uuid.uuid4()),
                job_type=job_type,
                metadata=metadata or {},
            )
            
            self._jobs[job.job_id] = job
            logger.info(f"Created job: {job.job_id} (type: {job_type})")
            
            return job
    
    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID."""
        return self._jobs.get(job_id)
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status as dictionary."""
        job = self._jobs.get(job_id)
        if not job:
            return None
        return job.to_dict()
    
    async def list_jobs(
        self,
        job_type: str = None,
        status: JobStatus = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        List jobs with optional filtering.
        
        Args:
            job_type: Filter by job type
            status: Filter by status
            limit: Maximum number of jobs to return
            
        Returns:
            List of job dictionaries
        """
        jobs = list(self._jobs.values())
        
        # Apply filters
        if job_type:
            jobs = [j for j in jobs if j.job_type == job_type]
        if status:
            jobs = [j for j in jobs if j.status == status]
        
        # Sort by created_at descending
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        
        return [j.to_dict() for j in jobs[:limit]]
    
    async def run_job(
        self,
        job: Job,
        task_fn: Callable[[Job], Awaitable[None]]
    ) -> None:
        """
        Run a job in the background.
        
        Args:
            job: Job instance
            task_fn: Async function to execute (receives job instance)
        """
        async def _wrapped_task():
            try:
                job.start()
                await task_fn(job)
                # If task_fn doesn't set status, mark as completed
                if job.status == JobStatus.RUNNING:
                    job.complete()
            except Exception as e:
                logger.error(f"Job {job.job_id} failed: {e}")
                job.fail(str(e))
            finally:
                # Cleanup task reference
                if job.job_id in self._tasks:
                    del self._tasks[job.job_id]
        
        # Create and store task
        task = asyncio.create_task(_wrapped_task())
        self._tasks[job.job_id] = task
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running job.
        
        Args:
            job_id: Job ID to cancel
            
        Returns:
            True if cancelled successfully
        """
        job = self._jobs.get(job_id)
        if not job:
            return False
        
        if job.status not in (JobStatus.PENDING, JobStatus.RUNNING):
            return False
        
        # Cancel task if running
        task = self._tasks.get(job_id)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        job.cancel()
        return True
    
    async def delete_job(self, job_id: str) -> bool:
        """
        Delete a job from memory.
        
        Args:
            job_id: Job ID to delete
            
        Returns:
            True if deleted successfully
        """
        async with self._lock:
            if job_id in self._jobs:
                # Cancel if running
                await self.cancel_job(job_id)
                del self._jobs[job_id]
                return True
            return False
    
    async def _cleanup_old_jobs(self) -> None:
        """Remove old completed/failed jobs."""
        now = datetime.utcnow()
        to_remove = []
        
        for job_id, job in self._jobs.items():
            if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
                if job.completed_at:
                    age_hours = (now - job.completed_at).total_seconds() / 3600
                    if age_hours > self._job_ttl_hours:
                        to_remove.append(job_id)
        
        for job_id in to_remove:
            del self._jobs[job_id]
            logger.debug(f"Cleaned up old job: {job_id}")
        
        if to_remove:
            logger.info(f"Cleaned up {len(to_remove)} old jobs")


# Global job manager instance
_job_manager: Optional[JobManager] = None


def get_job_manager() -> JobManager:
    """Get or create the global JobManager instance."""
    global _job_manager
    if _job_manager is None:
        _job_manager = JobManager()
    return _job_manager
