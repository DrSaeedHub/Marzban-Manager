-- Migration: 008_create_audit_tables.sql
-- Description: Create AuditLog table for activity tracking
-- Created: 2026-01-08

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "AuditLogID"         SERIAL PRIMARY KEY,
    "EntityType"         VARCHAR(50) NOT NULL,
    "EntityID"           INTEGER NOT NULL,
    "ActionType"         VARCHAR(50) NOT NULL,
    "ActionDescription"  TEXT NULL,
    "OldValue"           JSONB NULL,
    "NewValue"           JSONB NULL,
    "PerformedByUserID"  INTEGER NULL,
    "PerformedByIP"      INET NULL,
    "CreatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

COMMENT ON TABLE "AuditLog" IS 'Comprehensive activity log for all entities';
COMMENT ON COLUMN "AuditLog"."AuditLogID" IS 'Unique identifier for the log entry';
COMMENT ON COLUMN "AuditLog"."EntityType" IS 'Type of entity (e.g., MarzbanPanel, Node, ConfigurationTemplate)';
COMMENT ON COLUMN "AuditLog"."EntityID" IS 'ID of the affected entity';
COMMENT ON COLUMN "AuditLog"."ActionType" IS 'Type of action performed (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN "AuditLog"."ActionDescription" IS 'Human-readable description of the action';
COMMENT ON COLUMN "AuditLog"."OldValue" IS 'Previous state of the entity (for updates/deletes)';
COMMENT ON COLUMN "AuditLog"."NewValue" IS 'New state of the entity (for creates/updates)';
COMMENT ON COLUMN "AuditLog"."PerformedByUserID" IS 'User who performed the action (future: FK to users table)';
COMMENT ON COLUMN "AuditLog"."PerformedByIP" IS 'IP address from which the action was performed';
COMMENT ON COLUMN "AuditLog"."CreatedDate" IS 'Timestamp when the action occurred (UTC)';

-- ============================================================
-- PREDEFINED ACTION TYPES (documented as comments)
-- ============================================================
-- CREATE         - Entity was created
-- UPDATE         - Entity was updated
-- DELETE         - Entity was hard deleted
-- SOFT_DELETE    - Entity was soft deleted
-- CONNECT        - Connection established (panel/node)
-- DISCONNECT     - Connection lost (panel/node)
-- RECONNECT      - Reconnection attempt
-- ASSIGN_TEMPLATE    - Template assigned to node
-- UNASSIGN_TEMPLATE  - Template unassigned from node
-- SSH_INSTALL    - Node installed via SSH
-- SSH_UNINSTALL  - Node uninstalled via SSH
-- CONFIG_SNAPSHOT    - Config snapshot created
-- CONFIG_RESTORE     - Config restored from snapshot

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '008_create_audit_tables.sql', 'Create AuditLog table')
ON CONFLICT DO NOTHING;
