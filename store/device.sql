-- database: ../dev.sqlite
CREATE TABLE
    sessions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        name TEXT,
        profile_url TEXT,
        is_business_account BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_sessions_status ON sessions (status);

CREATE TABLE
    devices (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        device_info TEXT,
        last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX idx_devices_session_id ON devices (session_id);

CREATE TABLE
    auth_tokens (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        token TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX idx_auth_tokens_session_id ON auth_tokens (session_id);

CREATE TABLE
    session_contacts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        contact_info TEXT,
        added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX idx_session_contacts_session_id ON session_contacts (session_id);

CREATE TABLE
    session_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        message_content TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX idx_session_messages_session_id ON session_messages (session_id);

CREATE TABLE
    session_chats (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        chat_info TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX idx_session_chats_session_id ON session_chats (session_id);

CREATE TABLE
    session_configurations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        config_key TEXT NOT NULL,
        config_value TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX idx_session_configurations_session_id ON session_configurations (session_id);