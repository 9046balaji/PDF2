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
    conn = op.get_bind()
    
    # Step 1: Create ENUM types if they don't exist
    logger.info("Creating ENUM types...")
    
    try:
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
    except Exception as e:
        logger.error(f"Error creating ENUM types: {e}")
        raise
    
    # Step 2: Enable extensions
    logger.info("Enabling extensions...")
    
    try:
        conn.execute(text("""
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
            CREATE EXTENSION IF NOT EXISTS "pg_trgm";
            CREATE EXTENSION IF NOT EXISTS "unaccent";
        """))
        logger.info("Extensions enabled successfully.")
    except Exception as e:
        logger.error(f"Error enabling extensions: {e}")
        raise
    
    # Step 3: Create tables
    logger.info("Creating new tables...")
    
    try:
        # Create new tables based on the schema
        # Users table
        if not conn.dialect.has_table(conn, 'users'):
            op.create_table('users',
                sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid4),
                sa.Column('username', sa.String(100), nullable=False, unique=True),
                sa.Column('email', sa.String(255), nullable=False, unique=True),
                sa.Column('password_hash', sa.String(255), nullable=False),
                sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
                sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
                sa.Column('last_login_at', sa.DateTime(timezone=True)),
                sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
                sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
                # Additional fields from existing model
                sa.Column('phone_number', sa.String(20), unique=True),
                sa.Column('google_drive_token', sa.Text),
                sa.Column('webhook_url', sa.String(255)),
                sa.Column('suggested_workflow', sa.JSON),
                sa.Column('login_count', sa.Integer, server_default=sa.text('0')),
                sa.Column('last_ip', sa.String(45)),
                sa.Column('user_agent', sa.String(255))
            )
            logger.info("Created users table.")
        
        # User login history table
        if not conn.dialect.has_table(conn, 'user_login_history'):
            op.create_table('user_login_history',
                sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid4),
                sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
                sa.Column('login_time', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
                sa.Column('ip_address', sa.String(45)),
                sa.Column('user_agent', sa.Text),
                sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
                sa.Column('device_info', sa.JSON)
            )
            logger.info("Created user_login_history table.")
        
        # Groups table
        if not conn.dialect.has_table(conn, 'groups'):
            op.create_table('groups',
                sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid4),
                sa.Column('name', sa.String(100), nullable=False, unique=True),
                sa.Column('description', sa.Text),
                sa.Column('owner_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
                sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
                sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
            )
            logger.info("Created groups table.")
        
        # Group members table
        if not conn.dialect.has_table(conn, 'group_members'):
            op.create_table('group_members',
                sa.Column('group_id', UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True),
                sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
                sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
                sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
            )
            logger.info("Created group_members table.")
        
        # PDF files table
        if not conn.dialect.has_table(conn, 'pdf_files'):
            op.create_table('pdf_files',
                sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid4),
                sa.Column('owner_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
                sa.Column('filename', sa.String(255), nullable=False),
                sa.Column('title', sa.String(255)),
                sa.Column('description', sa.Text),
                sa.Column('storage_backend', sa.String(50), nullable=False, server_default=sa.text("'local'")),
                sa.Column('storage_path', sa.Text, nullable=False),
                sa.Column('content_type', sa.String(100)),
                sa.Column('filesize', sa.BigInteger),
                sa.Column('checksum', sa.String(128)),
                sa.Column('page_count', sa.Integer),
                sa.Column('access_count', sa.BigInteger, nullable=False, server_default=sa.text('0')),
                sa.Column('visibility', ENUM('private', 'shared', 'public', name='visibility_enum', create_type=False), 
                          nullable=False, server_default=sa.text("'private'")),
                sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
                sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
                sa.Column('search_vector', TSVECTOR),
                # Additional fields from existing model
                sa.Column('original_filename', sa.String(255)),
                sa.Column('doc_type', sa.String(50)),
                sa.Column('doc_metadata', sa.JSON),
                # Table constraints
                sa.CheckConstraint('filesize >= 0', name='pdf_files_filesize_check'),
                sa.CheckConstraint('page_count >= 0', name='pdf_files_page_count_check'),
                sa.CheckConstraint('access_count >= 0', name='pdf_files_access_count_check')
            )
            logger.info("Created pdf_files table.")
            
            # Create search index
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS pdf_files_search_idx ON pdf_files USING GIN (search_vector);
                CREATE INDEX IF NOT EXISTS pdf_files_trgm_title_idx ON pdf_files USING GIN (title gin_trgm_ops);
            """))
            logger.info("Created pdf_files search indexes.")
            
            # Create search trigger
            conn.execute(text("""
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
            """))
            logger.info("Created pdf_files search trigger.")
        
        # Create other tables (file_versions, file_shares, etc.)
        # ...

        # Set up updated_at triggers
        conn.execute(text("""
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
        logger.info("Created updated_at triggers.")

        logger.info("All tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise
    
    # Step 4: Migrate data from old tables to new ones
    logger.info("Migrating data from old tables to new ones...")
    
    try:
        # Example: Migrate users data
        if conn.dialect.has_table(conn, 'user') and conn.dialect.has_table(conn, 'users'):
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
        
        # Other data migrations...
        
        logger.info("Data migration completed successfully.")
    except Exception as e:
        logger.error(f"Error migrating data: {e}")
        raise
    
    logger.info("Database schema upgrade completed successfully.")

def downgrade():
    """Downgrade database schema to previous version."""
    conn = op.get_bind()
    
    logger.info("Downgrading database schema...")
    
    # Drop tables in reverse order (to handle foreign key constraints)
    for table in ['quota', 'api_tokens', 'thumbnails', 'file_tags', 'tags', 
                 'file_conversion_record', 'file_access_logs', 'file_shares', 
                 'file_versions', 'pdf_files', 'group_members', 'groups', 
                 'user_login_history', 'users']:
        if conn.dialect.has_table(conn, table):
            op.drop_table(table)
            logger.info(f"Dropped table {table}.")
    
    # Drop ENUM types
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
    
    logger.info("Database schema downgrade completed successfully.")
