-- Migration: 011_seed_default_settings.sql
-- Description: Seed default application settings
-- Created: 2026-01-08

-- ============================================================
-- SEED DEFAULT APPLICATION SETTINGS
-- ============================================================

INSERT INTO "AppSetting" ("SettingKey", "SettingValue", "SettingDescription")
VALUES 
    ('DEFAULT_SERVICE_PORT', '62050', 'Default node service port for new nodes'),
    ('DEFAULT_API_PORT', '62051', 'Default node API port for new nodes'),
    ('DEFAULT_USAGE_COEFFICIENT', '1.0', 'Default traffic usage coefficient for new nodes'),
    ('ENCRYPTION_KEY_ID', 'key_v1', 'Current encryption key identifier for credential encryption'),
    ('DEFAULT_SSH_PORT', '22', 'Default SSH port for SSH profile creation'),
    ('DEFAULT_SSH_USERNAME', 'root', 'Default SSH username for SSH profile creation'),
    ('AUTO_SYNC_INTERVAL_MINUTES', '5', 'Interval in minutes for automatic panel sync'),
    ('MAX_CONNECTION_RETRIES', '3', 'Maximum number of connection retry attempts'),
    ('CONNECTION_TIMEOUT_SECONDS', '30', 'Connection timeout in seconds for panel/node connections')
ON CONFLICT ("SettingKey") DO NOTHING;

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '011_seed_default_settings.sql', 'Seed default application settings')
ON CONFLICT DO NOTHING;
