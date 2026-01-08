-- Migration: 004_create_node_tables.sql
-- Description: Create Node table with constraints
-- Created: 2026-01-08

-- ============================================================
-- NODE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "Node" (
    "NodeID"             SERIAL PRIMARY KEY,
    "MarzbanPanelID"     INTEGER NOT NULL,
    "NodeStatusID"       INTEGER NOT NULL DEFAULT 20,
    "NodeName"           VARCHAR(100) NOT NULL,
    "Address"            VARCHAR(255) NOT NULL,
    "ServicePort"        INTEGER NOT NULL DEFAULT 62050,
    "APIPort"            INTEGER NOT NULL DEFAULT 62051,
    "UsageCoefficient"   DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "XrayVersion"        VARCHAR(50) NULL,
    "StatusMessage"      TEXT NULL,
    "Uplink"             BIGINT NOT NULL DEFAULT 0,
    "Downlink"           BIGINT NOT NULL DEFAULT 0,
    "SSHProfileID"       INTEGER NULL,
    "AddAsNewHost"       BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "IsDeleted"          BOOLEAN NOT NULL DEFAULT FALSE,
    "DeletedDate"        TIMESTAMPTZ NULL,
    
    -- Foreign Key Constraints
    CONSTRAINT "FK_Node_MarzbanPanel" 
        FOREIGN KEY ("MarzbanPanelID") 
        REFERENCES "MarzbanPanel"("MarzbanPanelID") 
        ON DELETE CASCADE,
    
    CONSTRAINT "FK_Node_NodeStatus" 
        FOREIGN KEY ("NodeStatusID") 
        REFERENCES "NodeStatus"("NodeStatusID"),
    
    -- Check Constraints
    CONSTRAINT "CK_Node_ServicePort_Range" 
        CHECK ("ServicePort" BETWEEN 1 AND 65535),
    
    CONSTRAINT "CK_Node_APIPort_Range" 
        CHECK ("APIPort" BETWEEN 1 AND 65535),
    
    CONSTRAINT "CK_Node_Ports_Different" 
        CHECK ("ServicePort" != "APIPort"),
    
    CONSTRAINT "CK_Node_UsageCoefficient_Positive" 
        CHECK ("UsageCoefficient" > 0),
    
    CONSTRAINT "CK_Node_Uplink_NonNegative" 
        CHECK ("Uplink" >= 0),
    
    CONSTRAINT "CK_Node_Downlink_NonNegative" 
        CHECK ("Downlink" >= 0)
);

-- Partial unique constraints (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_Node_PanelID_NodeName_Active" 
    ON "Node"("MarzbanPanelID", "NodeName") 
    WHERE "IsDeleted" = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_Node_PanelID_Address_Port_Active" 
    ON "Node"("MarzbanPanelID", "Address", "ServicePort") 
    WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "Node" IS 'Stores Marzban nodes belonging to panels';
COMMENT ON COLUMN "Node"."NodeID" IS 'Unique identifier for the node';
COMMENT ON COLUMN "Node"."MarzbanPanelID" IS 'Reference to the parent panel (a node belongs to exactly one panel)';
COMMENT ON COLUMN "Node"."NodeStatusID" IS 'Current connection status of the node';
COMMENT ON COLUMN "Node"."NodeName" IS 'User-friendly name for the node';
COMMENT ON COLUMN "Node"."Address" IS 'IP address or hostname of the node server';
COMMENT ON COLUMN "Node"."ServicePort" IS 'Service port for node communication (default: 62050)';
COMMENT ON COLUMN "Node"."APIPort" IS 'API port for node management (default: 62051)';
COMMENT ON COLUMN "Node"."UsageCoefficient" IS 'Traffic multiplier for this node (default: 1.00)';
COMMENT ON COLUMN "Node"."XrayVersion" IS 'Xray version running on the node';
COMMENT ON COLUMN "Node"."StatusMessage" IS 'Detailed status or error message';
COMMENT ON COLUMN "Node"."Uplink" IS 'Total upload traffic in bytes';
COMMENT ON COLUMN "Node"."Downlink" IS 'Total download traffic in bytes';
COMMENT ON COLUMN "Node"."SSHProfileID" IS 'Reference to SSH profile used for installation (optional)';
COMMENT ON COLUMN "Node"."AddAsNewHost" IS 'Whether to add as new host for every inbound';
COMMENT ON COLUMN "Node"."CreatedDate" IS 'Timestamp when the node was added (UTC)';
COMMENT ON COLUMN "Node"."UpdatedDate" IS 'Timestamp of last modification (UTC)';
COMMENT ON COLUMN "Node"."IsDeleted" IS 'Soft delete flag';
COMMENT ON COLUMN "Node"."DeletedDate" IS 'Timestamp when the node was soft deleted';

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '004_create_node_tables.sql', 'Create Node table with constraints')
ON CONFLICT DO NOTHING;
