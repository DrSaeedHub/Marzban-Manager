-- Migration: 006_create_ssh_profile_tables.sql
-- Description: Create SSHProfile table for reusable SSH credentials
-- Created: 2026-01-08

-- ============================================================
-- SSH PROFILE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "SSHProfile" (
    "SSHProfileID"       SERIAL PRIMARY KEY,
    "ProfileName"        VARCHAR(100) NOT NULL,
    "Host"               VARCHAR(255) NOT NULL,
    "Port"               INTEGER NOT NULL DEFAULT 22,
    "Username"           VARCHAR(100) NOT NULL DEFAULT 'root',
    "EncryptedPassword"  BYTEA NULL,
    "PrivateKey"         BYTEA NULL,
    "UseKeyAuth"         BOOLEAN NOT NULL DEFAULT FALSE,
    "DefaultServicePort" INTEGER NOT NULL DEFAULT 62050,
    "DefaultAPIPort"     INTEGER NOT NULL DEFAULT 62051,
    "InstallDocker"      BOOLEAN NOT NULL DEFAULT TRUE,
    "AutoStartNode"      BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "IsDeleted"          BOOLEAN NOT NULL DEFAULT FALSE,
    "DeletedDate"        TIMESTAMPTZ NULL,
    
    -- Check Constraints
    CONSTRAINT "CK_SSHProfile_Port_Range" 
        CHECK ("Port" BETWEEN 1 AND 65535),
    
    CONSTRAINT "CK_SSHProfile_DefaultServicePort_Range" 
        CHECK ("DefaultServicePort" BETWEEN 1 AND 65535),
    
    CONSTRAINT "CK_SSHProfile_DefaultAPIPort_Range" 
        CHECK ("DefaultAPIPort" BETWEEN 1 AND 65535),
    
    -- Must have at least one authentication method
    CONSTRAINT "CK_SSHProfile_HasAuth" 
        CHECK ("EncryptedPassword" IS NOT NULL OR "PrivateKey" IS NOT NULL)
);

-- Partial unique constraint (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_SSHProfile_ProfileName_Active" 
    ON "SSHProfile"("ProfileName") 
    WHERE "IsDeleted" = FALSE;

COMMENT ON TABLE "SSHProfile" IS 'Reusable SSH credentials for node installation';
COMMENT ON COLUMN "SSHProfile"."SSHProfileID" IS 'Unique identifier for the SSH profile';
COMMENT ON COLUMN "SSHProfile"."ProfileName" IS 'User-friendly name for the profile';
COMMENT ON COLUMN "SSHProfile"."Host" IS 'SSH server hostname or IP address';
COMMENT ON COLUMN "SSHProfile"."Port" IS 'SSH port (default: 22)';
COMMENT ON COLUMN "SSHProfile"."Username" IS 'SSH username (default: root)';
COMMENT ON COLUMN "SSHProfile"."EncryptedPassword" IS 'AES-256-GCM encrypted SSH password (binary)';
COMMENT ON COLUMN "SSHProfile"."PrivateKey" IS 'AES-256-GCM encrypted SSH private key (binary)';
COMMENT ON COLUMN "SSHProfile"."UseKeyAuth" IS 'Whether to use key-based authentication';
COMMENT ON COLUMN "SSHProfile"."DefaultServicePort" IS 'Default service port for nodes created with this profile';
COMMENT ON COLUMN "SSHProfile"."DefaultAPIPort" IS 'Default API port for nodes created with this profile';
COMMENT ON COLUMN "SSHProfile"."InstallDocker" IS 'Whether to install Docker during node installation';
COMMENT ON COLUMN "SSHProfile"."AutoStartNode" IS 'Whether to auto-start node after installation';
COMMENT ON COLUMN "SSHProfile"."CreatedDate" IS 'Timestamp when the profile was created (UTC)';
COMMENT ON COLUMN "SSHProfile"."UpdatedDate" IS 'Timestamp of last modification (UTC)';
COMMENT ON COLUMN "SSHProfile"."IsDeleted" IS 'Soft delete flag';
COMMENT ON COLUMN "SSHProfile"."DeletedDate" IS 'Timestamp when the profile was soft deleted';

-- ============================================================
-- ADD FOREIGN KEY TO NODE TABLE (deferred to avoid circular reference)
-- ============================================================

-- Add FK constraint from Node to SSHProfile (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_Node_SSHProfile' 
        AND table_name = 'Node'
    ) THEN
        ALTER TABLE "Node" 
        ADD CONSTRAINT "FK_Node_SSHProfile" 
            FOREIGN KEY ("SSHProfileID") 
            REFERENCES "SSHProfile"("SSHProfileID") 
            ON DELETE SET NULL;
    END IF;
END $$;

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '006_create_ssh_profile_tables.sql', 'Create SSHProfile table')
ON CONFLICT DO NOTHING;
