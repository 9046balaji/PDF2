"""
Migration script to update the database schema to match the improved init_schema.sql.
This script creates necessary tables, ENUMs, and indexes.
It also handles the migration of data from old tables to new ones.
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import text
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM, ARRAY, TSVECTOR

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Migration metadata
"""
Migration ID: 20250907_update_schema_for_improved_pdf_tool
Created: 2025-09-07
Description: Updates database schema to match improved init_schema.sql
"""

def upgrade():
    """Upgrade database schema to match improved init_schema.sql."""
    from sqlalchemy import create_engine, text, inspect
    from sqlalchemy.dialects.postgresql import UUID, ENUM, ARRAY, TSVECTOR
    import sqlalchemy as sa
    import sys
    from pathlib import Path
    
    # Import the app and db from the parent directory
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from app import db
    
    # Get connection from the db object
    conn = db.engine.connect()
    inspector = inspect(db.engine)
    
    # Check the database type
    is_sqlite = 'sqlite' in db.engine.url.drivername
    is_postgres = 'postgresql' in db.engine.url.drivername
    
    logger.info(f"Database type: {'SQLite' if is_sqlite else 'PostgreSQL' if is_postgres else 'Unknown'}")
    
    # Create new tables
    logger.info("Creating new tables...")
    
    try:
        # Create tables using SQLAlchemy models
        db.create_all()
        logger.info("Created tables using SQLAlchemy models.")
        
        # If PostgreSQL, create additional features
        if is_postgres:
            # Step 1: Create ENUM types if they don't exist
            logger.info("Creating PostgreSQL ENUM types...")
            
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_enum') THEN
                        CREATE TYPE visibility_enum AS ENUM ('private', 'shared', 'public');
                    END IF;
                    
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'share_type_enum') THEN
                        CREATE TYPE share_type_enum AS ENUM ('link', 'user', 'group');
                    END IF;
                    
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_enum') THEN
                        CREATE TYPE permission_enum AS ENUM ('view', 'download', 'edit');
                    END IF;
                    
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_status_enum') THEN
                        CREATE TYPE conversion_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
                    END IF;
                END
                $$;
            """))
            logger.info("ENUM types created successfully.")
            
            # Step 2: Enable extensions
            logger.info("Enabling PostgreSQL extensions...")
            
            conn.execute(text("""
                CREATE EXTENSION IF NOT EXISTS "pgcrypto";
                CREATE EXTENSION IF NOT EXISTS "pg_trgm";
                CREATE EXTENSION IF NOT EXISTS "unaccent";
            """))
            logger.info("Extensions enabled successfully.")
            
            # Create search indexes and triggers
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS pdf_files_search_idx ON pdf_files USING GIN (search_vector);
                CREATE INDEX IF NOT EXISTS pdf_files_trgm_title_idx ON pdf_files USING GIN (title gin_trgm_ops);
                
                CREATE OR REPLACE FUNCTION pdf_files_search_trigger() RETURNS trigger AS $$
                BEGIN
                  NEW.search_vector :=
                    setweight(to_tsvector('simple', unaccent(coalesce(NEW.title,''))), 'A') ||
                    setweight(to_tsvector('simple', unaccent(coalesce(NEW.filename,''))), 'B') ||
                    setweight(to_tsvector('simple', unaccent(coalesce(NEW.description,''))), 'C');
                  RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                
                DROP TRIGGER IF EXISTS pdf_files_tsvector ON pdf_files;
                CREATE TRIGGER pdf_files_tsvector BEFORE INSERT OR UPDATE
                  ON pdf_files FOR EACH ROW EXECUTE FUNCTION pdf_files_search_trigger();
                  
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                  NEW.updated_at = now();
                  RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                
                DROP TRIGGER IF EXISTS set_updated_at ON pdf_files;
                CREATE TRIGGER set_updated_at BEFORE UPDATE ON pdf_files
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                
                DROP TRIGGER IF EXISTS set_updated_at ON users;
                CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                
                DROP TRIGGER IF EXISTS set_updated_at ON file_shares;
                CREATE TRIGGER set_updated_at BEFORE UPDATE ON file_shares
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                
                DROP TRIGGER IF EXISTS set_updated_at ON groups;
                CREATE TRIGGER set_updated_at BEFORE UPDATE ON groups
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            """))
            logger.info("Created PostgreSQL search indexes and triggers.")
            
            # Migrate data from old tables
            tables = inspector.get_table_names()
            if 'user' in tables and 'users' in tables:
                conn.execute(text("""
                    INSERT INTO users (id, username, email, password_hash, is_active, is_admin, created_at, updated_at, 
                                    phone_number, google_drive_token, webhook_url, suggested_workflow)
                    SELECT gen_random_uuid(), username, email, password_hash, TRUE, 
                        CASE WHEN is_admin = TRUE THEN TRUE ELSE FALSE END, 
                        created_at, created_at, phone_number, google_drive_token, webhook_url, suggested_workflow
                    FROM "user"
                    ON CONFLICT (email) DO NOTHING;
                """))
                logger.info("Migrated users data.")
        else:
            # SQLite doesn't support these features
            logger.info("Skipping PostgreSQL-specific features for SQLite database.")
        
        logger.info("All tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise
    
    # Close the connection
    conn.close()
    
    logger.info("Database schema upgrade completed successfully.")

def downgrade():
    """Downgrade database schema to previous version."""
    import sys
    from pathlib import Path
    from sqlalchemy import text, inspect
    
    # Import the app and db from the parent directory
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from app import db
    
    # Get connection from the db object
    conn = db.engine.connect()
    inspector = inspect(db.engine)
    
    # Check the database type
    is_sqlite = 'sqlite' in db.engine.url.drivername
    is_postgres = 'postgresql' in db.engine.url.drivername
    
    logger.info(f"Database type: {'SQLite' if is_sqlite else 'PostgreSQL' if is_postgres else 'Unknown'}")
    logger.info("Downgrading database schema...")
    
    # Drop tables in reverse order (to handle foreign key constraints)
    for table in ['quota', 'api_tokens', 'thumbnails', 'file_tags', 'tags', 
                 'file_conversion_record', 'file_access_logs', 'file_shares', 
                 'file_versions', 'pdf_files', 'group_members', 'groups', 
                 'user_login_history', 'users']:
        try:
            conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
            logger.info(f"Dropped table {table}.")
        except Exception as e:
            logger.warning(f"Error dropping table {table}: {e}")
    
    # If PostgreSQL, drop ENUM types
    if is_postgres:
        try:
            conn.execute(text("""
                DROP TYPE IF EXISTS conversion_status_enum;
                DROP TYPE IF EXISTS permission_enum;
                DROP TYPE IF EXISTS share_type_enum;
                DROP TYPE IF EXISTS visibility_enum;
            """))
            logger.info("Dropped ENUM types.")
        except Exception as e:
            logger.error(f"Error dropping ENUM types: {e}")
            raise
    
    # Close the connection
    conn.close()
    
    logger.info("Database schema downgrade completed successfully.")
