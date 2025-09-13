"""Add login history, file conversion, and app_config tables

Revision ID: 20250907_add_tracking_tables
Revises: 
Create Date: 2025-09-07 

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import datetime

# revision identifiers, used by Alembic
revision = '20250907_add_tracking_tables'
down_revision = None  # Set to the previous migration ID if available
branch_labels = None
depends_on = None


def upgrade():
    # Add columns to User table
    op.add_column('user', sa.Column('last_login', sa.DateTime(), nullable=True))
    op.add_column('user', sa.Column('login_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('user', sa.Column('last_ip', sa.String(45), nullable=True))
    op.add_column('user', sa.Column('user_agent', sa.String(255), nullable=True))
    
    # Create UserLoginHistory table
    op.create_table(
        'user_login_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('login_time', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(255), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('device_info', sa.JSON(), nullable=True)
    )
    
    # Add columns to FileRecord table
    op.add_column('file_record', sa.Column('last_accessed', sa.DateTime(), nullable=True))
    op.add_column('file_record', sa.Column('access_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('file_record', sa.Column('page_count', sa.Integer(), nullable=True))
    op.add_column('file_record', sa.Column('storage_path', sa.String(255), nullable=True))
    op.add_column('file_record', sa.Column('mimetype', sa.String(100), nullable=True))
    op.add_column('file_record', sa.Column('hash_md5', sa.String(32), nullable=True))
    
    # Create FileConversionRecord table
    op.create_table(
        'file_conversion_record',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('original_file_id', sa.Integer(), sa.ForeignKey('file_record.id'), nullable=False),
        sa.Column('output_file', sa.String(200), nullable=False),
        sa.Column('conversion_type', sa.String(50), nullable=False),
        sa.Column('conversion_time', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('status', sa.String(20), nullable=False, server_default='completed'),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('pg_tools_version', sa.String(20), nullable=True, server_default='2.0.12\\Windows')
    )
    
    # Create app_config table
    op.create_table(
        'app_config',
        sa.Column('key', sa.String(100), primary_key=True),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    
    # Insert initial data
    op.bulk_insert(
        sa.table('app_config',
            sa.column('key', sa.String(100)),
            sa.column('value', sa.Text()),
            sa.column('updated_at', sa.DateTime())
        ),
        [
            {'key': 'pg_tools_version', 'value': '2.0.12\\Windows', 'updated_at': datetime.now()}
        ]
    )


def downgrade():
    # Drop added tables
    op.drop_table('app_config')
    op.drop_table('file_conversion_record')
    op.drop_table('user_login_history')
    
    # Remove added columns from FileRecord
    op.drop_column('file_record', 'hash_md5')
    op.drop_column('file_record', 'mimetype')
    op.drop_column('file_record', 'storage_path')
    op.drop_column('file_record', 'page_count')
    op.drop_column('file_record', 'access_count')
    op.drop_column('file_record', 'last_accessed')
    
    # Remove added columns from User
    op.drop_column('user', 'user_agent')
    op.drop_column('user', 'last_ip')
    op.drop_column('user', 'login_count')
    op.drop_column('user', 'last_login')
