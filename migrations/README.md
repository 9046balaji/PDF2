# Database Migrations

This directory contains database migration scripts for the PDF Processing Tool.

## Migration Types

Two types of migration scripts are provided:

1. **Alembic Migrations** (Python-based):
   - Files with `.py` extension
   - Used with the Alembic migration framework
   - Provides schema versioning and rollback capabilities

2. **Raw SQL Migrations**:
   - Files with `.sql` extension
   - Can be executed directly with PostgreSQL client tools
   - Useful for environments without Alembic

## Available Migrations

- **20250907_add_tracking_tables**: Adds user login history tracking, file conversion tracking, and app configuration tables

## Using Alembic Migrations

1. If not initialized yet, run the Alembic initialization:
   ```
   python init_alembic.py
   ```

2. Apply all migrations:
   ```
   alembic upgrade head
   ```

3. To rollback the latest migration:
   ```
   alembic downgrade -1
   ```

## Using Raw SQL Migrations

1. For Windows:
   ```
   run_sql_migration.bat [database_name] [username] [host] [port]
   ```

2. For Linux/macOS:
   ```
   ./run_sql_migration.sh [database_name] [username] [host] [port]
   ```

## Manual Database Connection

You can also execute the SQL scripts directly with psql:

```
psql -U username -d database_name -f migrations/20250907_add_tracking_tables.sql
```

## Migration Details

### 20250907_add_tracking_tables

This migration adds:

1. **User Activity Tracking**:
   - Adds login tracking columns to the User table
   - Creates a UserLoginHistory table to record all login attempts

2. **File Operation Tracking**:
   - Adds metadata columns to the FileRecord table
   - Creates a FileConversionRecord table to track all file conversions

3. **System Configuration**:
   - Creates an app_config table for system-wide settings
   - Stores PostgreSQL tools version information (2.0.12\Windows)

This migration supports the enhanced user login and file tracking functionality.
