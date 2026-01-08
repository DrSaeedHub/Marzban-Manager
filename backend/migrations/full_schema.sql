-- ==========================================================================
-- MARZBAN-MANAGER FULL DATABASE SCHEMA
-- PostgreSQL 14+
-- 
-- This file contains the complete schema for reference and fresh installs.
-- For incremental updates, use the numbered migration files instead.
-- ==========================================================================

-- Set timezone for session
SET timezone = 'UTC';

-- ============================================================
-- SCHEMA VERSION TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS "SchemaVersion" (
    "SchemaVersionID"    SERIAL PRIMARY KEY,
    "Version"            VARCHAR(20) NOT NULL,
    "MigrationFile"      VARCHAR(100) NOT NULL,
    "AppliedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "Description"        TEXT NULL
);

COMMENT ON TABLE "SchemaVersion" IS 'Tracks database schema version and applied migrations';

-- ============================================================
-- LOOKUP TABLES
-- ============================================================

-- Panel Status
CREATE TABLE IF NOT EXISTS "PanelStatus" (
    "PanelStatusID"      INTEGER PRIMARY KEY,
    "StatusTitle"        VARCHAR(50) NOT NULL,
    "StatusDescription"  TEXT NULL
);

COMMENT ON TABLE "PanelStatus" IS 'Predefined panel connection states';

-- Node Status
CREATE TABLE IF NOT EXISTS "NodeStatus" (
    "NodeStatusID"       INTEGER PRIMARY KEY,
    "StatusTitle"        VARCHAR(50) NOT NULL,
    "StatusDescription"  TEXT NULL
);

COMMENT ON TABLE "NodeStatus" IS 'Predefined node connection states';

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Marzban Panel
CREATE TABLE IF NOT EXISTS "MarzbanPanel" (
    "MarzbanPanelID"     SERIAL PRIMARY KEY,
    "PanelName"          VARCHAR(100) NOT NULL,
    "PanelURL"           VARCHAR(500) NOT NULL,
    "PanelStatusID"      INTEGER NOT NULL DEFAULT 20,
    "StatusMessage"      TEXT NULL,
    "Certificate"        TEXT NULL,
    "LastSyncDate"       TIMESTAMPTZ NULL,
    "CreatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "IsDeleted"          BOOLEAN NOT NULL DEFAULT FALSE,
    "DeletedDate"        TIMESTAMPTZ NULL,
    
    CONSTRAINT "FK_MarzbanPanel_PanelStatus" 
        FOREIGN KEY ("PanelStatusID") 
        REFERENCES "PanelStatus"("PanelStatusID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_MarzbanPanel_PanelName_Active" 
    ON "MarzbanPanel"("PanelName") WHERE "IsDeleted" = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_MarzbanPanel_PanelURL_Active" 
    ON "MarzbanPanel"("PanelURL") WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "MarzbanPanel" IS 'Stores Marzban panel connections';

-- Panel Credential
CREATE TABLE IF NOT EXISTS "PanelCredential" (
    "PanelCredentialID"  SERIAL PRIMARY KEY,
    "MarzbanPanelID"     INTEGER NOT NULL UNIQUE,
    "Username"           VARCHAR(100) NOT NULL,
    "Password"           VARCHAR(500) NOT NULL,
    "AccessToken"        TEXT NULL,
    "TokenExpiryDate"    TIMESTAMPTZ NULL,
    "CreatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    
    CONSTRAINT "FK_PanelCredential_MarzbanPanel" 
        FOREIGN KEY ("MarzbanPanelID") 
        REFERENCES "MarzbanPanel"("MarzbanPanelID") 
        ON DELETE CASCADE
);

COMMENT ON TABLE "PanelCredential" IS 'Stores panel authentication credentials';
COMMENT ON COLUMN "PanelCredential"."Password" IS 'Admin password (plain text)';

-- SSH Profile
CREATE TABLE IF NOT EXISTS "SSHProfile" (
    "SSHProfileID"       SERIAL PRIMARY KEY,
    "ProfileName"        VARCHAR(100) NOT NULL,
    "Host"               VARCHAR(255) NOT NULL,
    "Port"               INTEGER NOT NULL DEFAULT 22,
    "Username"           VARCHAR(100) NOT NULL DEFAULT 'root',
    "Password"           VARCHAR(500) NULL,
    "PrivateKey"         TEXT NULL,
    "UseKeyAuth"         BOOLEAN NOT NULL DEFAULT FALSE,
    "DefaultServicePort" INTEGER NOT NULL DEFAULT 62050,
    "DefaultAPIPort"     INTEGER NOT NULL DEFAULT 62051,
    "InstallDocker"      BOOLEAN NOT NULL DEFAULT TRUE,
    "AutoStartNode"      BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "IsDeleted"          BOOLEAN NOT NULL DEFAULT FALSE,
    "DeletedDate"        TIMESTAMPTZ NULL,
    
    CONSTRAINT "CK_SSHProfile_Port_Range" CHECK ("Port" BETWEEN 1 AND 65535),
    CONSTRAINT "CK_SSHProfile_DefaultServicePort_Range" CHECK ("DefaultServicePort" BETWEEN 1 AND 65535),
    CONSTRAINT "CK_SSHProfile_DefaultAPIPort_Range" CHECK ("DefaultAPIPort" BETWEEN 1 AND 65535),
    CONSTRAINT "CK_SSHProfile_HasAuth" CHECK ("Password" IS NOT NULL OR "PrivateKey" IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_SSHProfile_ProfileName_Active" 
    ON "SSHProfile"("ProfileName") WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "SSHProfile" IS 'Reusable SSH credentials for node installation';
COMMENT ON COLUMN "SSHProfile"."Password" IS 'SSH password (plain text)';
COMMENT ON COLUMN "SSHProfile"."PrivateKey" IS 'SSH private key (plain text)';

-- Node
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
    
    CONSTRAINT "FK_Node_MarzbanPanel" 
        FOREIGN KEY ("MarzbanPanelID") 
        REFERENCES "MarzbanPanel"("MarzbanPanelID") ON DELETE CASCADE,
    CONSTRAINT "FK_Node_NodeStatus" 
        FOREIGN KEY ("NodeStatusID") 
        REFERENCES "NodeStatus"("NodeStatusID"),
    CONSTRAINT "FK_Node_SSHProfile" 
        FOREIGN KEY ("SSHProfileID") 
        REFERENCES "SSHProfile"("SSHProfileID") ON DELETE SET NULL,
    CONSTRAINT "CK_Node_ServicePort_Range" CHECK ("ServicePort" BETWEEN 1 AND 65535),
    CONSTRAINT "CK_Node_APIPort_Range" CHECK ("APIPort" BETWEEN 1 AND 65535),
    CONSTRAINT "CK_Node_Ports_Different" CHECK ("ServicePort" != "APIPort"),
    CONSTRAINT "CK_Node_UsageCoefficient_Positive" CHECK ("UsageCoefficient" > 0),
    CONSTRAINT "CK_Node_Uplink_NonNegative" CHECK ("Uplink" >= 0),
    CONSTRAINT "CK_Node_Downlink_NonNegative" CHECK ("Downlink" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_Node_PanelID_NodeName_Active" 
    ON "Node"("MarzbanPanelID", "NodeName") WHERE "IsDeleted" = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_Node_PanelID_Address_Port_Active" 
    ON "Node"("MarzbanPanelID", "Address", "ServicePort") WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "Node" IS 'Stores Marzban nodes belonging to panels';

-- Configuration Template
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
    
    CONSTRAINT "CK_ConfigurationTemplate_Protocol" 
        CHECK ("Protocol" IN ('vless', 'vmess', 'trojan', 'shadowsocks')),
    CONSTRAINT "CK_ConfigurationTemplate_Transport" 
        CHECK ("Transport" IN ('tcp', 'kcp', 'ws', 'grpc', 'httpupgrade', 'xhttp')),
    CONSTRAINT "CK_ConfigurationTemplate_Security" 
        CHECK ("Security" IN ('none', 'tls', 'reality')),
    CONSTRAINT "CK_ConfigurationTemplate_Port_Range" 
        CHECK ("Port" BETWEEN 1 AND 65535)
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ConfigurationTemplate_Tag_Active" 
    ON "ConfigurationTemplate"("Tag") WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "ConfigurationTemplate" IS 'Global reusable Xray inbound configuration templates';

-- Node Template Assignment (Junction Table)
CREATE TABLE IF NOT EXISTS "NodeTemplateAssignment" (
    "NodeTemplateAssignmentID"  SERIAL PRIMARY KEY,
    "NodeID"                    INTEGER NOT NULL,
    "ConfigurationTemplateID"   INTEGER NOT NULL,
    "AssignedDate"              TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "AssignedByUserID"          INTEGER NULL,
    
    CONSTRAINT "UQ_NodeTemplateAssignment_Node_Template" 
        UNIQUE ("NodeID", "ConfigurationTemplateID"),
    CONSTRAINT "FK_NodeTemplateAssignment_Node" 
        FOREIGN KEY ("NodeID") 
        REFERENCES "Node"("NodeID") ON DELETE CASCADE,
    CONSTRAINT "FK_NodeTemplateAssignment_ConfigurationTemplate" 
        FOREIGN KEY ("ConfigurationTemplateID") 
        REFERENCES "ConfigurationTemplate"("ConfigurationTemplateID") ON DELETE CASCADE
);

COMMENT ON TABLE "NodeTemplateAssignment" IS 'Many-to-many junction for node-template relationships';

-- Panel Config Snapshot
CREATE TABLE IF NOT EXISTS "PanelConfigSnapshot" (
    "PanelConfigSnapshotID"  SERIAL PRIMARY KEY,
    "MarzbanPanelID"         INTEGER NOT NULL,
    "ConfigJSON"             JSONB NOT NULL,
    "SnapshotReason"         VARCHAR(100) NULL,
    "CreatedDate"            TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "CreatedByUserID"        INTEGER NULL,
    
    CONSTRAINT "FK_PanelConfigSnapshot_MarzbanPanel" 
        FOREIGN KEY ("MarzbanPanelID") 
        REFERENCES "MarzbanPanel"("MarzbanPanelID") ON DELETE CASCADE
);

COMMENT ON TABLE "PanelConfigSnapshot" IS 'Historical snapshots of panel Xray configurations';

-- Audit Log
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

-- App Setting
CREATE TABLE IF NOT EXISTS "AppSetting" (
    "SettingKey"         VARCHAR(100) PRIMARY KEY,
    "SettingValue"       TEXT NOT NULL,
    "SettingDescription" TEXT NULL,
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

COMMENT ON TABLE "AppSetting" IS 'Key-value store for application-level settings';

-- ============================================================
-- SEED DATA
-- ============================================================

-- Panel Status Values
INSERT INTO "PanelStatus" ("PanelStatusID", "StatusTitle", "StatusDescription")
VALUES 
    (10, 'Connected', 'Panel is connected and operational'),
    (20, 'Connecting', 'Connection attempt in progress'),
    (30, 'Error', 'Connection failed or authentication error'),
    (40, 'Disabled', 'Panel manually disabled by user')
ON CONFLICT ("PanelStatusID") DO NOTHING;

-- Node Status Values
INSERT INTO "NodeStatus" ("NodeStatusID", "StatusTitle", "StatusDescription")
VALUES 
    (10, 'Connected', 'Node is connected and operational'),
    (20, 'Connecting', 'Connection attempt in progress'),
    (30, 'Error', 'Connection failed or node unreachable'),
    (40, 'Disabled', 'Node manually disabled by user')
ON CONFLICT ("NodeStatusID") DO NOTHING;

-- Default Application Settings
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

-- ============================================================
-- INDEXES
-- ============================================================

-- MarzbanPanel indexes
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_status" ON "MarzbanPanel"("PanelStatusID");
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_deleted" ON "MarzbanPanel"("IsDeleted");
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_name_active" ON "MarzbanPanel"("PanelName") WHERE "IsDeleted" = FALSE;
CREATE INDEX IF NOT EXISTS "idx_marzbanpanel_lastsync" ON "MarzbanPanel"("LastSyncDate" DESC NULLS LAST);

-- PanelCredential indexes
CREATE INDEX IF NOT EXISTS "idx_panelcredential_panel" ON "PanelCredential"("MarzbanPanelID");
CREATE INDEX IF NOT EXISTS "idx_panelcredential_tokenexpiry" ON "PanelCredential"("TokenExpiryDate") WHERE "AccessToken" IS NOT NULL;

-- Node indexes
CREATE INDEX IF NOT EXISTS "idx_node_panel" ON "Node"("MarzbanPanelID");
CREATE INDEX IF NOT EXISTS "idx_node_status" ON "Node"("NodeStatusID");
CREATE INDEX IF NOT EXISTS "idx_node_panel_deleted" ON "Node"("MarzbanPanelID", "IsDeleted");
CREATE INDEX IF NOT EXISTS "idx_node_address" ON "Node"("Address");
CREATE INDEX IF NOT EXISTS "idx_node_sshprofile" ON "Node"("SSHProfileID") WHERE "SSHProfileID" IS NOT NULL;

-- ConfigurationTemplate indexes
CREATE INDEX IF NOT EXISTS "idx_configtemplate_protocol" ON "ConfigurationTemplate"("Protocol");
CREATE INDEX IF NOT EXISTS "idx_configtemplate_protocol_transport" ON "ConfigurationTemplate"("Protocol", "Transport");
CREATE INDEX IF NOT EXISTS "idx_configtemplate_security" ON "ConfigurationTemplate"("Security");
CREATE INDEX IF NOT EXISTS "idx_configtemplate_config_gin" ON "ConfigurationTemplate" USING GIN("Config");
CREATE INDEX IF NOT EXISTS "idx_configtemplate_tag_active" ON "ConfigurationTemplate"("Tag") WHERE "IsDeleted" = FALSE;

-- NodeTemplateAssignment indexes
CREATE INDEX IF NOT EXISTS "idx_nodetemplate_node" ON "NodeTemplateAssignment"("NodeID");
CREATE INDEX IF NOT EXISTS "idx_nodetemplate_template" ON "NodeTemplateAssignment"("ConfigurationTemplateID");
CREATE INDEX IF NOT EXISTS "idx_nodetemplate_assigned" ON "NodeTemplateAssignment"("AssignedDate" DESC);

-- SSHProfile indexes
CREATE INDEX IF NOT EXISTS "idx_sshprofile_name_active" ON "SSHProfile"("ProfileName") WHERE "IsDeleted" = FALSE;
CREATE INDEX IF NOT EXISTS "idx_sshprofile_host" ON "SSHProfile"("Host");

-- PanelConfigSnapshot indexes
CREATE INDEX IF NOT EXISTS "idx_panelconfig_panel" ON "PanelConfigSnapshot"("MarzbanPanelID");
CREATE INDEX IF NOT EXISTS "idx_panelconfig_created" ON "PanelConfigSnapshot"("CreatedDate" DESC);
CREATE INDEX IF NOT EXISTS "idx_panelconfig_panel_created" ON "PanelConfigSnapshot"("MarzbanPanelID", "CreatedDate" DESC);

-- AuditLog indexes
CREATE INDEX IF NOT EXISTS "idx_auditlog_entity" ON "AuditLog"("EntityType", "EntityID");
CREATE INDEX IF NOT EXISTS "idx_auditlog_created" ON "AuditLog"("CreatedDate" DESC);
CREATE INDEX IF NOT EXISTS "idx_auditlog_action" ON "AuditLog"("ActionType");
CREATE INDEX IF NOT EXISTS "idx_auditlog_user" ON "AuditLog"("PerformedByUserID") WHERE "PerformedByUserID" IS NOT NULL;

-- AppSetting indexes
CREATE INDEX IF NOT EXISTS "idx_appsetting_updated" ON "AppSetting"("UpdatedDate" DESC);

-- ============================================================
-- SCHEMA VERSION TRACKING
-- ============================================================

INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', 'full_schema.sql', 'Full schema installation')
ON CONFLICT DO NOTHING;
