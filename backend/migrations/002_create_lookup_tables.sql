-- Migration: 002_create_lookup_tables.sql
-- Description: Create PanelStatus and NodeStatus lookup tables
-- Created: 2026-01-08

-- ============================================================
-- PANEL STATUS LOOKUP TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "PanelStatus" (
    "PanelStatusID"      INTEGER PRIMARY KEY,
    "StatusTitle"        VARCHAR(50) NOT NULL,
    "StatusDescription"  TEXT NULL
);

COMMENT ON TABLE "PanelStatus" IS 'Predefined panel connection states';
COMMENT ON COLUMN "PanelStatus"."PanelStatusID" IS 'Unique identifier for panel status';
COMMENT ON COLUMN "PanelStatus"."StatusTitle" IS 'Human-readable status name';
COMMENT ON COLUMN "PanelStatus"."StatusDescription" IS 'Detailed description of the status';

-- ============================================================
-- NODE STATUS LOOKUP TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "NodeStatus" (
    "NodeStatusID"       INTEGER PRIMARY KEY,
    "StatusTitle"        VARCHAR(50) NOT NULL,
    "StatusDescription"  TEXT NULL
);

COMMENT ON TABLE "NodeStatus" IS 'Predefined node connection states';
COMMENT ON COLUMN "NodeStatus"."NodeStatusID" IS 'Unique identifier for node status';
COMMENT ON COLUMN "NodeStatus"."StatusTitle" IS 'Human-readable status name';
COMMENT ON COLUMN "NodeStatus"."StatusDescription" IS 'Detailed description of the status';

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '002_create_lookup_tables.sql', 'Create PanelStatus and NodeStatus lookup tables')
ON CONFLICT DO NOTHING;
