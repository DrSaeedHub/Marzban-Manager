-- Migration: 007_create_config_snapshot_table.sql
-- Description: Create PanelConfigSnapshot table for historical config storage
-- Created: 2026-01-08

-- ============================================================
-- PANEL CONFIG SNAPSHOT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "PanelConfigSnapshot" (
    "PanelConfigSnapshotID"  SERIAL PRIMARY KEY,
    "MarzbanPanelID"         INTEGER NOT NULL,
    "ConfigJSON"             JSONB NOT NULL,
    "SnapshotReason"         VARCHAR(100) NULL,
    "CreatedDate"            TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "CreatedByUserID"        INTEGER NULL,
    
    -- Foreign Key Constraint
    CONSTRAINT "FK_PanelConfigSnapshot_MarzbanPanel" 
        FOREIGN KEY ("MarzbanPanelID") 
        REFERENCES "MarzbanPanel"("MarzbanPanelID") 
        ON DELETE CASCADE
);

COMMENT ON TABLE "PanelConfigSnapshot" IS 'Historical snapshots of panel Xray configurations';
COMMENT ON COLUMN "PanelConfigSnapshot"."PanelConfigSnapshotID" IS 'Unique identifier for the snapshot';
COMMENT ON COLUMN "PanelConfigSnapshot"."MarzbanPanelID" IS 'Reference to the panel this snapshot belongs to';
COMMENT ON COLUMN "PanelConfigSnapshot"."ConfigJSON" IS 'Full Xray configuration as JSONB';
COMMENT ON COLUMN "PanelConfigSnapshot"."SnapshotReason" IS 'Reason for creating the snapshot (e.g., manual backup, before update)';
COMMENT ON COLUMN "PanelConfigSnapshot"."CreatedDate" IS 'Timestamp when the snapshot was created (UTC)';
COMMENT ON COLUMN "PanelConfigSnapshot"."CreatedByUserID" IS 'User who created the snapshot (future: FK to users table)';

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '007_create_config_snapshot_table.sql', 'Create PanelConfigSnapshot table')
ON CONFLICT DO NOTHING;
