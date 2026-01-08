-- Migration 013: Change ALL password storage from encrypted to plain text
-- WARNING: This migration will clear existing passwords. 
-- Users will need to re-enter credentials after this migration.

-- ============================================================
-- PANEL CREDENTIAL TABLE
-- ============================================================

-- Delete all existing panel credentials (we cannot decrypt them anyway)
DELETE FROM "PanelCredential";

-- Drop EncryptedPassword column if it exists
ALTER TABLE "PanelCredential"
DROP COLUMN IF EXISTS "EncryptedPassword";

-- Add Password column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PanelCredential' AND column_name = 'Password'
    ) THEN
        ALTER TABLE "PanelCredential" ADD COLUMN "Password" VARCHAR(500) NOT NULL;
    END IF;
END $$;

COMMENT ON COLUMN "PanelCredential"."Password" IS 'Admin password (plain text)';

-- ============================================================
-- SSH PROFILE TABLE
-- ============================================================

-- Delete all existing SSH profiles (we cannot decrypt them anyway)
DELETE FROM "SSHProfile";

-- Drop EncryptedPassword column if it exists
ALTER TABLE "SSHProfile"
DROP COLUMN IF EXISTS "EncryptedPassword";

-- Add Password column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SSHProfile' AND column_name = 'Password'
    ) THEN
        ALTER TABLE "SSHProfile" ADD COLUMN "Password" VARCHAR(500) NULL;
    END IF;
END $$;

-- Drop encrypted PrivateKey column if it exists (was BYTEA)
-- and recreate as TEXT for plain text storage
ALTER TABLE "SSHProfile"
DROP COLUMN IF EXISTS "PrivateKey";

ALTER TABLE "SSHProfile"
ADD COLUMN IF NOT EXISTS "PrivateKey" TEXT NULL;

-- Drop the old constraint and add new one
ALTER TABLE "SSHProfile"
DROP CONSTRAINT IF EXISTS "CK_SSHProfile_HasAuth";

ALTER TABLE "SSHProfile"
ADD CONSTRAINT "CK_SSHProfile_HasAuth" CHECK ("Password" IS NOT NULL OR "PrivateKey" IS NOT NULL);

COMMENT ON COLUMN "SSHProfile"."Password" IS 'SSH password (plain text)';
COMMENT ON COLUMN "SSHProfile"."PrivateKey" IS 'SSH private key (plain text)';

-- Track migration
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.13', '013_change_password_to_plaintext.sql', 'Change all password storage from encrypted to plain text')
ON CONFLICT DO NOTHING;
