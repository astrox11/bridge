PRAGMA foreign_keys = ON;

CREATE TABLE
    IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        name TEXT,
        profileUrl TEXT,
        isBusinessAccount BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);

CREATE TABLE
    IF NOT EXISTS devices (
        sessionId TEXT NOT NULL,
        User TEXT NOT NULL,
        deviceInfo TEXT,
        lastSeenAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (sessionId, User),
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS auth_tokens (
        sessionId TEXT NOT NULL,
        token TEXT NOT NULL,
        value TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (sessionId, token),
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS session_contacts (
        sessionId TEXT NOT NULL,
        contactPn TEXT NOT NULL,
        contactLid TEXT,
        addedAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP NOT NULL,
        PRIMARY KEY (sessionId, contactPn),
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_session_contacts_sessionId ON session_contacts (sessionId);

CREATE TABLE
    IF NOT EXISTS session_messages (
        sessionId TEXT NOT NULL,
        messageId TEXT PRIMARY KEY,
        messageContent TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS session_configurations (
        sessionId TEXT PRIMARY KEY,
        configKey TEXT NOT NULL,
        configValue TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS session_groups (
        groupId TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        groupInfo TEXT,
        updatedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );
