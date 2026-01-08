-- Migration: 012_create_indexes.sql
-- Description: Create all indexes for optimal query performance
-- Created: 2026-01-08

-- ============================================================
-- MARZBAN PANEL INDEXES
-- ============================================================

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_status" 
    ON "MarzbanPanel"("PanelStatusID");

-- Index for filtering by deleted status
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_deleted" 
    ON "MarzbanPanel"("IsDeleted");

-- Index for finding active panels by name (partial)
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_name_active" 
    ON "MarzbanPanel"("PanelName") 
    WHERE "IsDeleted" = FALSE;

-- Index for last sync date queries
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_lastsync" 
    ON "MarzbanPanel"("LastSyncDate" DESC NULLS LAST);

-- ============================================================
-- PANEL CREDENTIAL INDEXES
-- ============================================================

-- Index for panel lookup
CREATE INDEX IF NOT EXISTS "idx_panelcredential_panel" 
    ON "PanelCredential"("MarzbanPanelID");

-- Index for token expiry tracking (partial - only where token exists)
CREATE INDEX IF NOT EXISTS "idx_panelcredential_tokenexpiry" 
    ON "PanelCredential"("TokenExpiryDate") 
    WHERE "AccessToken" IS NOT NULL;

-- ============================================================
-- NODE INDEXES
-- ============================================================

-- Index for filtering nodes by panel
CREATE INDEX IF NOT EXISTS "idx_node_panel" 
    ON "Node"("MarzbanPanelID");

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS "idx_node_status" 
    ON "Node"("NodeStatusID");

-- Composite index for panel + deleted status (common query pattern)
CREATE INDEX IF NOT EXISTS "idx_node_panel_deleted" 
    ON "Node"("MarzbanPanelID", "IsDeleted");

-- Index for finding nodes by address
CREATE INDEX IF NOT EXISTS "idx_node_address" 
    ON "Node"("Address");

-- Index for SSH profile reference
CREATE INDEX IF NOT EXISTS "idx_node_sshprofile" 
    ON "Node"("SSHProfileID") 
    WHERE "SSHProfileID" IS NOT NULL;

-- ============================================================
-- CONFIGURATION TEMPLATE INDEXES
-- ============================================================

-- Index for filtering by protocol
CREATE INDEX IF NOT EXISTS "idx_configtemplate_protocol" 
    ON "ConfigurationTemplate"("Protocol");

-- Composite index for protocol + transport (common filter combination)
CREATE INDEX IF NOT EXISTS "idx_configtemplate_protocol_transport" 
    ON "ConfigurationTemplate"("Protocol", "Transport");

-- Index for security filter
CREATE INDEX IF NOT EXISTS "idx_configtemplate_security" 
    ON "ConfigurationTemplate"("Security");

-- GIN index for JSONB queries on Config column
CREATE INDEX IF NOT EXISTS "idx_configtemplate_config_gin" 
    ON "ConfigurationTemplate" USING GIN("Config");

-- Index for active templates by tag (partial)
CREATE INDEX IF NOT EXISTS "idx_configtemplate_tag_active" 
    ON "ConfigurationTemplate"("Tag") 
    WHERE "IsDeleted" = FALSE;

-- ============================================================
-- NODE TEMPLATE ASSIGNMENT INDEXES
-- ============================================================

-- Index for finding assignments by node
CREATE INDEX IF NOT EXISTS "idx_nodetemplate_node" 
    ON "NodeTemplateAssignment"("NodeID");

-- Index for finding assignments by template
CREATE INDEX IF NOT EXISTS "idx_nodetemplate_template" 
    ON "NodeTemplateAssignment"("ConfigurationTemplateID");

-- Index for sorting by assignment date
CREATE INDEX IF NOT EXISTS "idx_nodetemplate_assigned" 
    ON "NodeTemplateAssignment"("AssignedDate" DESC);

-- ============================================================
-- SSH PROFILE INDEXES
-- ============================================================

-- Index for active profiles by name (partial)
CREATE INDEX IF NOT EXISTS "idx_sshprofile_name_active" 
    ON "SSHProfile"("ProfileName") 
    WHERE "IsDeleted" = FALSE;

-- Index for finding profiles by host
CREATE INDEX IF NOT EXISTS "idx_sshprofile_host" 
    ON "SSHProfile"("Host");

-- ============================================================
-- PANEL CONFIG SNAPSHOT INDEXES
-- ============================================================

-- Index for finding snapshots by panel
CREATE INDEX IF NOT EXISTS "idx_panelconfig_panel" 
    ON "PanelConfigSnapshot"("MarzbanPanelID");

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS "idx_panelconfig_created" 
    ON "PanelConfigSnapshot"("CreatedDate" DESC);

-- Composite index for panel + creation date (common query: latest snapshot per panel)
CREATE INDEX IF NOT EXISTS "idx_panelconfig_panel_created" 
    ON "PanelConfigSnapshot"("MarzbanPanelID", "CreatedDate" DESC);

-- ============================================================
-- AUDIT LOG INDEXES
-- ============================================================

-- Composite index for entity queries (EntityType + EntityID)
CREATE INDEX IF NOT EXISTS "idx_auditlog_entity" 
    ON "AuditLog"("EntityType", "EntityID");

-- Index for sorting by creation date (most recent first)
CREATE INDEX IF NOT EXISTS "idx_auditlog_created" 
    ON "AuditLog"("CreatedDate" DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS "idx_auditlog_action" 
    ON "AuditLog"("ActionType");

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS "idx_auditlog_user" 
    ON "AuditLog"("PerformedByUserID") 
    WHERE "PerformedByUserID" IS NOT NULL;

-- ============================================================
-- APP SETTING INDEXES
-- ============================================================

-- Index for updated date (for tracking recent changes)
CREATE INDEX IF NOT EXISTS "idx_appsetting_updated" 
    ON "AppSetting"("UpdatedDate" DESC);

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '012_create_indexes.sql', 'Create all indexes')
ON CONFLICT DO NOTHING;
