-- Migration: 003_create_panel_tables.sql
-- Description: Create MarzbanPanel and PanelCredential tables
-- Created: 2026-01-08

-- ============================================================
-- MARZBAN PANEL TABLE
-- ============================================================

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
    
    -- Foreign Key Constraint
    CONSTRAINT "FK_MarzbanPanel_PanelStatus" 
        FOREIGN KEY ("PanelStatusID") 
        REFERENCES "PanelStatus"("PanelStatusID")
);

-- Partial unique constraints (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_MarzbanPanel_PanelName_Active" 
    ON "MarzbanPanel"("PanelName") 
    WHERE "IsDeleted" = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_MarzbanPanel_PanelURL_Active" 
    ON "MarzbanPanel"("PanelURL") 
    WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "MarzbanPanel" IS 'Stores Marzban panel connections';
COMMENT ON COLUMN "MarzbanPanel"."MarzbanPanelID" IS 'Unique identifier for the Marzban panel';
COMMENT ON COLUMN "MarzbanPanel"."PanelName" IS 'User-friendly name for the panel';
COMMENT ON COLUMN "MarzbanPanel"."PanelURL" IS 'Base URL of the Marzban panel (e.g., https://panel.example.com)';
COMMENT ON COLUMN "MarzbanPanel"."PanelStatusID" IS 'Current connection status of the panel';
COMMENT ON COLUMN "MarzbanPanel"."StatusMessage" IS 'Detailed status or error message';
COMMENT ON COLUMN "MarzbanPanel"."Certificate" IS 'SSL/TLS certificate for secure connections';
COMMENT ON COLUMN "MarzbanPanel"."LastSyncDate" IS 'Timestamp of last successful sync with the panel';
COMMENT ON COLUMN "MarzbanPanel"."CreatedDate" IS 'Timestamp when the panel was added (UTC)';
COMMENT ON COLUMN "MarzbanPanel"."UpdatedDate" IS 'Timestamp of last modification (UTC)';
COMMENT ON COLUMN "MarzbanPanel"."IsDeleted" IS 'Soft delete flag';
COMMENT ON COLUMN "MarzbanPanel"."DeletedDate" IS 'Timestamp when the panel was soft deleted';

-- ============================================================
-- PANEL CREDENTIAL TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "PanelCredential" (
    "PanelCredentialID"  SERIAL PRIMARY KEY,
    "MarzbanPanelID"     INTEGER NOT NULL UNIQUE,
    "Username"           VARCHAR(100) NOT NULL,
    "EncryptedPassword"  BYTEA NOT NULL,
    "AccessToken"        TEXT NULL,
    "TokenExpiryDate"    TIMESTAMPTZ NULL,
    "CreatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    
    -- Foreign Key Constraint
    CONSTRAINT "FK_PanelCredential_MarzbanPanel" 
        FOREIGN KEY ("MarzbanPanelID") 
        REFERENCES "MarzbanPanel"("MarzbanPanelID") 
        ON DELETE CASCADE
);

COMMENT ON TABLE "PanelCredential" IS 'Stores encrypted panel authentication credentials';
COMMENT ON COLUMN "PanelCredential"."PanelCredentialID" IS 'Unique identifier for the credential record';
COMMENT ON COLUMN "PanelCredential"."MarzbanPanelID" IS 'Reference to the associated panel (one-to-one)';
COMMENT ON COLUMN "PanelCredential"."Username" IS 'Panel login username';
COMMENT ON COLUMN "PanelCredential"."EncryptedPassword" IS 'AES-256-GCM encrypted password (binary)';
COMMENT ON COLUMN "PanelCredential"."AccessToken" IS 'Current API access token (short-lived)';
COMMENT ON COLUMN "PanelCredential"."TokenExpiryDate" IS 'Expiration timestamp for the access token';
COMMENT ON COLUMN "PanelCredential"."CreatedDate" IS 'Timestamp when credentials were created (UTC)';
COMMENT ON COLUMN "PanelCredential"."UpdatedDate" IS 'Timestamp of last credential update (UTC)';

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '003_create_panel_tables.sql', 'Create MarzbanPanel and PanelCredential tables')
ON CONFLICT DO NOTHING;
