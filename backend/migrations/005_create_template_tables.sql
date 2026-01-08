-- Migration: 005_create_template_tables.sql
-- Description: Create ConfigurationTemplate and NodeTemplateAssignment tables
-- Created: 2026-01-08

-- ============================================================
-- CONFIGURATION TEMPLATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "ConfigurationTemplate" (
    "ConfigurationTemplateID"   SERIAL PRIMARY KEY,
    "Tag"                       VARCHAR(100) NOT NULL,
    "Protocol"                  VARCHAR(20) NOT NULL,
    "Transport"                 VARCHAR(20) NOT NULL,
    "Security"                  VARCHAR(20) NOT NULL,
    "Port"                      INTEGER NOT NULL,
    "Config"                    JSONB NOT NULL,
    "CreatedDate"               TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedDate"               TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "IsDeleted"                 BOOLEAN NOT NULL DEFAULT FALSE,
    "DeletedDate"               TIMESTAMPTZ NULL,
    
    -- Check Constraints
    CONSTRAINT "CK_ConfigurationTemplate_Protocol" 
        CHECK ("Protocol" IN ('vless', 'vmess', 'trojan', 'shadowsocks')),
    
    CONSTRAINT "CK_ConfigurationTemplate_Transport" 
        CHECK ("Transport" IN ('tcp', 'kcp', 'ws', 'grpc', 'httpupgrade', 'xhttp')),
    
    CONSTRAINT "CK_ConfigurationTemplate_Security" 
        CHECK ("Security" IN ('none', 'tls', 'reality')),
    
    CONSTRAINT "CK_ConfigurationTemplate_Port_Range" 
        CHECK ("Port" BETWEEN 1 AND 65535)
);

-- Partial unique constraint (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ConfigurationTemplate_Tag_Active" 
    ON "ConfigurationTemplate"("Tag") 
    WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "ConfigurationTemplate" IS 'Global reusable Xray inbound configuration templates';
COMMENT ON COLUMN "ConfigurationTemplate"."ConfigurationTemplateID" IS 'Unique identifier for the template';
COMMENT ON COLUMN "ConfigurationTemplate"."Tag" IS 'Unique tag/name for the template (e.g., VLESS TCP REALITY)';
COMMENT ON COLUMN "ConfigurationTemplate"."Protocol" IS 'Xray protocol (vless, vmess, trojan, shadowsocks)';
COMMENT ON COLUMN "ConfigurationTemplate"."Transport" IS 'Transport layer (tcp, kcp, ws, grpc, httpupgrade, xhttp)';
COMMENT ON COLUMN "ConfigurationTemplate"."Security" IS 'Security layer (none, tls, reality)';
COMMENT ON COLUMN "ConfigurationTemplate"."Port" IS 'Default port for this configuration';
COMMENT ON COLUMN "ConfigurationTemplate"."Config" IS 'Full Xray inbound configuration as JSONB';
COMMENT ON COLUMN "ConfigurationTemplate"."CreatedDate" IS 'Timestamp when the template was created (UTC)';
COMMENT ON COLUMN "ConfigurationTemplate"."UpdatedDate" IS 'Timestamp of last modification (UTC)';
COMMENT ON COLUMN "ConfigurationTemplate"."IsDeleted" IS 'Soft delete flag';
COMMENT ON COLUMN "ConfigurationTemplate"."DeletedDate" IS 'Timestamp when the template was soft deleted';

-- ============================================================
-- NODE TEMPLATE ASSIGNMENT TABLE (Junction Table)
-- ============================================================

CREATE TABLE IF NOT EXISTS "NodeTemplateAssignment" (
    "NodeTemplateAssignmentID"  SERIAL PRIMARY KEY,
    "NodeID"                    INTEGER NOT NULL,
    "ConfigurationTemplateID"   INTEGER NOT NULL,
    "AssignedDate"              TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "AssignedByUserID"          INTEGER NULL,
    
    -- Unique constraint to prevent duplicate assignments
    CONSTRAINT "UQ_NodeTemplateAssignment_Node_Template" 
        UNIQUE ("NodeID", "ConfigurationTemplateID"),
    
    -- Foreign Key Constraints
    CONSTRAINT "FK_NodeTemplateAssignment_Node" 
        FOREIGN KEY ("NodeID") 
        REFERENCES "Node"("NodeID") 
        ON DELETE CASCADE,
    
    CONSTRAINT "FK_NodeTemplateAssignment_ConfigurationTemplate" 
        FOREIGN KEY ("ConfigurationTemplateID") 
        REFERENCES "ConfigurationTemplate"("ConfigurationTemplateID") 
        ON DELETE CASCADE
);

COMMENT ON TABLE "NodeTemplateAssignment" IS 'Many-to-many junction for node-template relationships';
COMMENT ON COLUMN "NodeTemplateAssignment"."NodeTemplateAssignmentID" IS 'Unique identifier for the assignment';
COMMENT ON COLUMN "NodeTemplateAssignment"."NodeID" IS 'Reference to the node';
COMMENT ON COLUMN "NodeTemplateAssignment"."ConfigurationTemplateID" IS 'Reference to the template';
COMMENT ON COLUMN "NodeTemplateAssignment"."AssignedDate" IS 'Timestamp when the template was assigned (UTC)';
COMMENT ON COLUMN "NodeTemplateAssignment"."AssignedByUserID" IS 'User who assigned the template (future: FK to users table)';

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '005_create_template_tables.sql', 'Create ConfigurationTemplate and NodeTemplateAssignment tables')
ON CONFLICT DO NOTHING;
