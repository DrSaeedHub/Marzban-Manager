-- Migration: 009_create_settings_table.sql
-- Description: Create AppSetting table for application-level settings
-- Created: 2026-01-08

-- ============================================================
-- APP SETTING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "AppSetting" (
    "SettingKey"         VARCHAR(100) PRIMARY KEY,
    "SettingValue"       TEXT NOT NULL,
    "SettingDescription" TEXT NULL,
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

COMMENT ON TABLE "AppSetting" IS 'Key-value store for application-level settings';
COMMENT ON COLUMN "AppSetting"."SettingKey" IS 'Unique setting identifier';
COMMENT ON COLUMN "AppSetting"."SettingValue" IS 'Setting value (stored as text, parsed by application)';
COMMENT ON COLUMN "AppSetting"."SettingDescription" IS 'Human-readable description of the setting';
COMMENT ON COLUMN "AppSetting"."UpdatedDate" IS 'Timestamp of last update (UTC)';

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '009_create_settings_table.sql', 'Create AppSetting table')
ON CONFLICT DO NOTHING;
