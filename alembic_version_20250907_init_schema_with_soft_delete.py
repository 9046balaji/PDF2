"""Alembic migration: create initial PDF tool schema with soft-delete support

Place this file in your Alembic `versions/` directory (e.g.
`alembic/versions/20250907_init_schema_with_soft_delete.py`) and run

    alembic upgrade head

Notes:
- This migration creates PostgreSQL extensions (pgcrypto, pg_trgm, unaccent).
- The DB user running this must have privileges to create extensions.
- If your project already has earlier migrations, set `down_revision` to the
  previous revision id.

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250907_init_schema_with_soft_delete'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # --- Extensions ---
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")

    # --- users ---
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('username', sa.String(length=100), nullable=False, unique=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # --- user_login_history ---
    op.create_table(
        'user_login_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('login_time', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('ip_address', sa.String(length=45)),
        sa.Column('user_agent', sa.Text()),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )

    # --- pdf_files ---
    op.create_table(
        'pdf_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255)),
        sa.Column('description', sa.Text()),
        sa.Column('storage_backend', sa.String(length=50), nullable=False, server_default=sa.text("'local'")),
        sa.Column('storage_path', sa.Text(), nullable=False),
        sa.Column('content_type', sa.String(length=100)),
        sa.Column('filesize', sa.BigInteger()),
        sa.Column('checksum', sa.String(length=128)),
        sa.Column('page_count', sa.Integer()),
        sa.Column('access_count', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('visibility', sa.String(length=20), nullable=False, server_default=sa.text("'private'")),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('search_vector', postgresql.TSVECTOR()),
        sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )

    # indexes for pdf_files
    op.create_index('pdf_files_owner_idx', 'pdf_files', ['owner_id'])
    op.create_index('pdf_files_visibility_idx', 'pdf_files', ['visibility'])
    # GIN index for tsvector
    op.create_index('pdf_files_search_idx', 'pdf_files', ['search_vector'], postgresql_using='gin')
    # trigram index on title (use raw SQL because of operator class)
    op.execute("CREATE INDEX IF NOT EXISTS pdf_files_trgm_title_idx ON pdf_files USING gin (title gin_trgm_ops);")

    # --- file_versions ---
    op.create_table(
        'file_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pdf_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('storage_path', sa.Text(), nullable=False),
        sa.Column('content_type', sa.String(length=100)),
        sa.Column('filesize', sa.BigInteger()),
        sa.Column('checksum', sa.String(length=128)),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('file_id', 'version_number', name='uq_file_versions_file_version')
    )
    op.create_index('file_versions_file_idx', 'file_versions', ['file_id'])

    # --- file_shares ---
    op.create_table(
        'file_shares',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pdf_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shared_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('share_type', sa.String(length=20), nullable=False),
        sa.Column('shared_with_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('share_token', sa.String(length=128)),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('permissions', sa.String(length=20), nullable=False, server_default=sa.text("'view'")),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('file_shares_file_idx', 'file_shares', ['file_id'])
    op.create_index('file_shares_token_idx', 'file_shares', ['share_token'])

    # --- file_access_logs ---
    op.create_table(
        'file_access_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pdf_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('access_time', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('ip_address', sa.String(length=45)),
        sa.Column('user_agent', sa.Text()),
        sa.Column('action', sa.String(length=30), nullable=False),
    )
    op.create_index('file_access_logs_file_idx', 'file_access_logs', ['file_id'])
    op.create_index('file_access_logs_user_idx', 'file_access_logs', ['user_id'])

    # --- file_conversion_record ---
    op.create_table(
        'file_conversion_record',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pdf_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_format', sa.String(length=50)),
        sa.Column('to_format', sa.String(length=50)),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('error', sa.Text()),
        sa.Column('started_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('completed_at', sa.TIMESTAMP(timezone=True)),
    )
    op.create_index('file_conversion_record_file_idx', 'file_conversion_record', ['file_id'])

    # --- tags and file_tags ---
    op.create_table(
        'tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=100), nullable=False, unique=True),
    )
    op.create_table(
        'file_tags',
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pdf_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tags.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('file_id', 'tag_id', name='pk_file_tags')
    )

    # --- thumbnails ---
    op.create_table(
        'thumbnails',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pdf_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('storage_path', sa.Text(), nullable=False),
        sa.Column('width', sa.Integer()),
        sa.Column('height', sa.Integer()),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('thumbnails_file_idx', 'thumbnails', ['file_id'])

    # --- api_tokens ---
    op.create_table(
        'api_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255)),
        sa.Column('token', sa.String(length=255), nullable=False, unique=True),
        sa.Column('scopes', sa.Text()),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # --- quota ---
    op.create_table(
        'quota',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('max_storage_bytes', sa.BigInteger(), nullable=False, server_default='1073741824'),
        sa.Column('used_storage_bytes', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('max_files', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('used_files', sa.Integer(), nullable=False, server_default='0'),
    )

    # --- app_config ---
    op.create_table(
        'app_config',
        sa.Column('key', sa.Text(), primary_key=True),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # --- triggers / functions ---
    # search_vector trigger
    op.execute(r"""
    CREATE OR REPLACE FUNCTION pdf_files_search_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.filename, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("DROP TRIGGER IF EXISTS pdf_files_tsvector ON pdf_files;")
    op.execute("CREATE TRIGGER pdf_files_tsvector BEFORE INSERT OR UPDATE ON pdf_files FOR EACH ROW EXECUTE FUNCTION pdf_files_search_trigger();")

    # updated_at trigger
    op.execute(r"""
    CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON pdf_files;")
    op.execute("CREATE TRIGGER set_updated_at BEFORE UPDATE ON pdf_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();")

    # --- convenience view: latest version ---
    op.execute(r"""
    CREATE OR REPLACE VIEW pdf_files_with_latest_version AS
    SELECT f.*, v.storage_path AS latest_storage_path, v.version_number AS latest_version_number
    FROM pdf_files f
    LEFT JOIN LATERAL (
      SELECT storage_path, version_number
      FROM file_versions
      WHERE file_id = f.id
      ORDER BY version_number DESC
      LIMIT 1
    ) v ON true;
    """)


def downgrade():
    # Drop view, triggers, functions, indexes, tables in reverse order
    op.execute("DROP VIEW IF EXISTS pdf_files_with_latest_version;")

    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON pdf_files;")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    op.execute("DROP TRIGGER IF EXISTS pdf_files_tsvector ON pdf_files;")
    op.execute("DROP FUNCTION IF EXISTS pdf_files_search_trigger();")

    # Drop indexes created with raw SQL
    op.execute("DROP INDEX IF EXISTS pdf_files_trgm_title_idx;")

    # Drop indexes created by op.create_index
    op.drop_index('pdf_files_search_idx', table_name='pdf_files')
    op.drop_index('pdf_files_visibility_idx', table_name='pdf_files')
    op.drop_index('pdf_files_owner_idx', table_name='pdf_files')

    op.drop_index('thumbnails_file_idx', table_name='thumbnails')
    op.drop_index('file_versions_file_idx', table_name='file_versions')
    op.drop_index('file_conversion_record_file_idx', table_name='file_conversion_record')
    op.drop_index('file_access_logs_user_idx', table_name='file_access_logs')
    op.drop_index('file_access_logs_file_idx', table_name='file_access_logs')
    op.drop_index('file_shares_token_idx', table_name='file_shares')
    op.drop_index('file_shares_file_idx', table_name='file_shares')

    # Drop tables
    op.drop_table('app_config')
    op.drop_table('quota')
    op.drop_table('api_tokens')
    op.drop_table('thumbnails')
    op.drop_table('file_tags')
    op.drop_table('tags')
    op.drop_table('file_conversion_record')
    op.drop_table('file_access_logs')
    op.drop_table('file_shares')
    op.drop_table('file_versions')
    op.drop_table('pdf_files')
    op.drop_table('user_login_history')
    op.drop_table('users')

    # Optionally: leave extensions in place; if you want to drop them uncomment:
    # op.execute("DROP EXTENSION IF EXISTS unaccent;")
    # op.execute("DROP EXTENSION IF EXISTS pg_trgm;")
    # op.execute("DROP EXTENSION IF EXISTS pgcrypto;")
