-- SQL Migration Script: Add login history, file conversion, and app_config tables
-- Date: 2025-09-07

BEGIN;

-- Add columns to User table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_ip VARCHAR(45);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);

-- Create UserLoginHistory table
CREATE TABLE IF NOT EXISTS user_login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    device_info JSONB
);

-- Create index for faster user login history queries
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_login_time ON user_login_history(login_time);

-- Add columns to FileRecord table
ALTER TABLE file_record ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP;
ALTER TABLE file_record ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE file_record ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE file_record ADD COLUMN IF NOT EXISTS storage_path VARCHAR(255);
ALTER TABLE file_record ADD COLUMN IF NOT EXISTS mimetype VARCHAR(100);
ALTER TABLE file_record ADD COLUMN IF NOT EXISTS hash_md5 VARCHAR(32);

-- Create index for faster file queries by hash
CREATE INDEX IF NOT EXISTS idx_file_record_hash_md5 ON file_record(hash_md5);

-- Create FileConversionRecord table
CREATE TABLE IF NOT EXISTS file_conversion_record (
    id SERIAL PRIMARY KEY,
    original_file_id INTEGER NOT NULL REFERENCES file_record(id),
    output_file VARCHAR(200) NOT NULL,
    conversion_type VARCHAR(50) NOT NULL,
    conversion_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    file_size INTEGER,
    processing_time_ms INTEGER,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    pg_tools_version VARCHAR(20) DEFAULT '2.0.12\Windows'
);

-- Create indexes for faster conversion queries
CREATE INDEX IF NOT EXISTS idx_file_conversion_record_original_file_id ON file_conversion_record(original_file_id);
CREATE INDEX IF NOT EXISTS idx_file_conversion_record_user_id ON file_conversion_record(user_id);
CREATE INDEX IF NOT EXISTS idx_file_conversion_record_conversion_time ON file_conversion_record(conversion_time);

-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO app_config (key, value, updated_at) 
VALUES ('pg_tools_version', '2.0.12\Windows', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE 
SET value = '2.0.12\Windows', updated_at = CURRENT_TIMESTAMP;

COMMIT;
