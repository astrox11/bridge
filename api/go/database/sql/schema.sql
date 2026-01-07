-- Whatsaly Main Database Schema
-- This file defines the core tables managed by the Go server
-- Per-user tables are created dynamically with format: user_{phone}_{tablename}

-- Sessions table - tracks all WhatsApp sessions (only shared table)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 4,
    user_info TEXT,
    created_at INTEGER NOT NULL
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone_number);
