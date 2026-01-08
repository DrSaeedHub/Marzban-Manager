-- Migration: 001_initial_schema.sql
-- Description: Create schema and enable required extensions
-- Created: 2026-01-08

-- ============================================================
-- MARZBAN-MANAGER DATABASE SCHEMA
-- PostgreSQL 14+
-- ============================================================

-- Enable UUID extension if needed in the future
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone for session
SET timezone = 'UTC';

-- Create a schema version tracking table
CREATE TABLE IF NOT EXISTS "SchemaVersion" (
    "SchemaVersionID"    SERIAL PRIMARY KEY,
    "Version"            VARCHAR(20) NOT NULL,
    "MigrationFile"      VARCHAR(100) NOT NULL,
    "AppliedDate"        TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "Description"        TEXT NULL
);

-- Insert initial version
INSERT INTO "SchemaVersion" ("Version", "MigrationFile", "Description")
VALUES ('1.0.0', '001_initial_schema.sql', 'Initial schema setup')
ON CONFLICT DO NOTHING;

-- Add comment to database
COMMENT ON TABLE "SchemaVersion" IS 'Tracks database schema version and applied migrations';
