"""
Template Service.

Business logic for configuration template management.
"""

import logging
from typing import Optional, List, Dict, Any
import json

from app.db.connection import DatabaseConnection
from app.repositories.template_repo import TemplateRepository
from app.repositories.node_repo import NodeTemplateAssignmentRepository
from app.repositories.audit_repo import log_audit
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse

logger = logging.getLogger(__name__)


class TemplateService:
    """Service for template management operations."""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.template_repo = TemplateRepository(db)
        self.assignment_repo = NodeTemplateAssignmentRepository(db)
    
    def _to_response(self, template: Dict[str, Any]) -> TemplateResponse:
        """Convert database record to response model."""
        config = template["Config"]
        if isinstance(config, str):
            config = json.loads(config)
        
        return TemplateResponse(
            id=template["ConfigurationTemplateID"],
            tag=template["Tag"],
            protocol=template["Protocol"],
            transport=template["Transport"],
            security=template["Security"],
            port=template["Port"],
            config=config,
            used_by_nodes=template.get("used_by_nodes", 0),
            created_at=template["CreatedDate"],
            updated_at=template.get("UpdatedDate"),
        )
    
    async def list_templates(
        self,
        protocol: str = None,
        transport: str = None
    ) -> List[TemplateResponse]:
        """List all templates with optional filters."""
        templates = self.template_repo.find_all_with_usage(
            protocol=protocol,
            transport=transport
        )
        return [self._to_response(t) for t in templates]
    
    async def get_template(self, template_id: int) -> Optional[TemplateResponse]:
        """Get template by ID."""
        template = self.template_repo.find_by_id_with_usage(template_id)
        if not template:
            return None
        return self._to_response(template)
    
    async def create_template(
        self,
        data: TemplateCreate,
        client_ip: str = None
    ) -> TemplateResponse:
        """Create a new template."""
        # Check for duplicate tag
        if self.template_repo.find_by_tag(data.tag):
            raise ValueError(f"Template with tag '{data.tag}' already exists")
        
        template = self.template_repo.create_template(
            tag=data.tag,
            protocol=data.protocol,
            transport=data.transport,
            security=data.security,
            port=data.port,
            config=data.config,
        )
        
        log_audit(
            self.db,
            entity_type="Template",
            entity_id=template["ConfigurationTemplateID"],
            action_type="CREATE",
            description=f"Created template '{data.tag}'",
            new_value={"tag": data.tag, "protocol": data.protocol},
            performed_by_ip=client_ip,
        )
        
        logger.info(f"Created template: {data.tag} ({template['ConfigurationTemplateID']})")
        
        return await self.get_template(template["ConfigurationTemplateID"])
    
    async def update_template(
        self,
        template_id: int,
        data: TemplateUpdate,
        client_ip: str = None
    ) -> Optional[TemplateResponse]:
        """Update template details."""
        existing = self.template_repo.find_by_id(template_id)
        if not existing:
            return None
        
        # Build update data
        update_data = {}
        if data.tag is not None and data.tag != existing["Tag"]:
            if self.template_repo.find_by_tag(data.tag):
                raise ValueError(f"Template with tag '{data.tag}' already exists")
            update_data["Tag"] = data.tag
        
        if data.protocol is not None:
            update_data["Protocol"] = data.protocol
        if data.transport is not None:
            update_data["Transport"] = data.transport
        if data.security is not None:
            update_data["Security"] = data.security
        if data.port is not None:
            update_data["Port"] = data.port
        if data.config is not None:
            update_data["Config"] = json.dumps(data.config)
        
        if update_data:
            self.template_repo.update(template_id, update_data)
            
            log_audit(
                self.db,
                entity_type="Template",
                entity_id=template_id,
                action_type="UPDATE",
                description=f"Updated template '{existing['Tag']}'",
                old_value={"tag": existing["Tag"]},
                new_value=update_data,
                performed_by_ip=client_ip,
            )
            
            logger.info(f"Updated template: {template_id}")
        
        return await self.get_template(template_id)
    
    async def delete_template(
        self,
        template_id: int,
        client_ip: str = None
    ) -> bool:
        """Soft delete a template."""
        existing = self.template_repo.find_by_id(template_id)
        if not existing:
            return False
        
        # Check if template is in use
        usage_count = self.assignment_repo.count_by_template(template_id)
        if usage_count > 0:
            logger.warning(f"Template {template_id} is used by {usage_count} nodes")
        
        success = self.template_repo.delete(template_id)
        
        if success:
            log_audit(
                self.db,
                entity_type="Template",
                entity_id=template_id,
                action_type="DELETE",
                description=f"Deleted template '{existing['Tag']}'",
                old_value={"tag": existing["Tag"], "used_by_nodes": usage_count},
                performed_by_ip=client_ip,
            )
            logger.info(f"Deleted template: {template_id}")
        
        return success
    
    async def duplicate_template(
        self,
        template_id: int,
        new_tag: str = None,
        client_ip: str = None
    ) -> Optional[TemplateResponse]:
        """Duplicate a template."""
        new_template = self.template_repo.duplicate_template(template_id, new_tag)
        if not new_template:
            return None
        
        log_audit(
            self.db,
            entity_type="Template",
            entity_id=new_template["ConfigurationTemplateID"],
            action_type="CREATE",
            description=f"Duplicated template from {template_id}",
            new_value={"source_id": template_id, "new_tag": new_template["Tag"]},
            performed_by_ip=client_ip,
        )
        
        logger.info(f"Duplicated template {template_id} to {new_template['ConfigurationTemplateID']}")
        
        return await self.get_template(new_template["ConfigurationTemplateID"])
