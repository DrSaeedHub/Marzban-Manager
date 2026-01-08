-- Migration: 010_seed_lookup_data.sql
-- Description: Seed predefined values for lookup tables
-- Created: 2026-01-08

-- ============================================================
-- SEED PANEL STATUS VALUES
-- ============================================================

INSERT INTO "PanelStatus" ("PanelStatusID", "StatusTitle", "StatusDescription")
VALUES 
    (10, 'Connected', 'Panel is connected and operational'),
    (20, 'Connecting', 'Connection attempt in progress'),
    (30, 'Error', 'Connection failed or authentication error'),
    (40, 'Disabled', 'Panel manually disabled by user')
ON CONFLICT ("PanelStatusID") DO UPDATE SET
    "StatusTitle" = EXCLUDED."StatusTitle",
    "StatusDescription" = EXCLUDED."StatusDescription";

-- ============================================================
-- SEED NODE STATUS VALUES
-- ============================================================

INSERT INTO "NodeStatus" ("NodeStatusID", "StatusTitle", "StatusDescription")
VALUES 
    (10, 'Connected', 'Node is connected and operational'),
    (20, 'Connecting', 'Connection attempt in progress'),
    (30, 'Error', 'Connection failed or node unreachable'),
    (40, 'Disabled', 'Node manually disabled by user')
ON CONFLICT ("NodeStatusID") DO UPDATE SET
    "StatusTitle" = EXCLUDED."StatusTitle",
    "StatusDescription" = EXCLUDED."StatusDescription";

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '010_seed_lookup_data.sql', 'Seed lookup table data')
ON CONFLICT DO NOTHING;
