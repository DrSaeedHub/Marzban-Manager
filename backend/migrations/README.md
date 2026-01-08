# Database Migrations

This directory contains SQL migration files for the Marzban-Manager database schema.

## Migration Files

| # | Filename | Description |
|---|----------|-------------|
| 001 | `001_initial_schema.sql` | Create schema version tracking table |
| 002 | `002_create_lookup_tables.sql` | Create `PanelStatus` and `NodeStatus` lookup tables |
| 003 | `003_create_panel_tables.sql` | Create `MarzbanPanel` and `PanelCredential` tables |
| 004 | `004_create_node_tables.sql` | Create `Node` table with constraints |
| 005 | `005_create_template_tables.sql` | Create `ConfigurationTemplate` and `NodeTemplateAssignment` tables |
| 006 | `006_create_ssh_profile_tables.sql` | Create `SSHProfile` table |
| 007 | `007_create_config_snapshot_table.sql` | Create `PanelConfigSnapshot` table |
| 008 | `008_create_audit_tables.sql` | Create `AuditLog` table |
| 009 | `009_create_settings_table.sql` | Create `AppSetting` table |
| 010 | `010_seed_lookup_data.sql` | Seed predefined status values |
| 011 | `011_seed_default_settings.sql` | Seed default application settings |
| 012 | `012_create_indexes.sql` | Create all performance indexes |

## Running Migrations

### Using the migration runner (Python)

```bash
# Set your database connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/marzban_manager"

# Run all migrations
python run_migrations.py

# Or run a specific migration
python run_migrations.py --file 001_initial_schema.sql
```

### Manual execution (psql)

```bash
# Connect to database and run migrations in order
psql -h localhost -U user -d marzban_manager

# Then execute each file:
\i migrations/001_initial_schema.sql
\i migrations/002_create_lookup_tables.sql
# ... continue for all files
```

## Schema Conventions

- **Table Names**: PascalCase (e.g., `MarzbanPanel`, `NodeStatus`)
- **Column Names**: PascalCase (e.g., `MarzbanPanelID`, `CreatedDate`)
- **Primary Keys**: `{TableName}ID` (e.g., `NodeID`, `PanelStatusID`)
- **Foreign Keys**: Same name as referenced column
- **Timestamps**: `TIMESTAMPTZ` with UTC storage
- **Soft Delete**: `IsDeleted` (BOOLEAN) + `DeletedDate` (TIMESTAMPTZ)
- **Index Names**: `idx_tablename_column` (lowercase)

## Entity Relationships

```
MarzbanPanel (1) ──── (N) Node
     │
     └── (1) PanelCredential
     │
     └── (N) PanelConfigSnapshot

ConfigurationTemplate (M) ──── (N) Node
                           via NodeTemplateAssignment

SSHProfile (1) ──── (N) Node (optional)
```

## Notes

- All migrations are **up-only** (no down migrations)
- Each migration is **idempotent** where possible
- Use `ON CONFLICT DO NOTHING` or `IF NOT EXISTS` for safety
- Rollback via PostgreSQL point-in-time recovery (PITR)
