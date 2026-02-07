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
    IF NOT EXISTS tokens (
        sessionId TEXT NOT NULL,
        token TEXT NOT NULL,
        value TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (sessionId, token),
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS contacts (
        sessionId TEXT NOT NULL,
        contactPn TEXT NOT NULL,
        contactLid TEXT,
        addedAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP NOT NULL,
        PRIMARY KEY (sessionId, contactPn),
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_contacts_sessionId ON contacts (sessionId);

CREATE TABLE
    IF NOT EXISTS messages (
        sessionId TEXT NOT NULL,
        messageId TEXT PRIMARY KEY,
        messageContent TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS configurations (
        sessionId TEXT PRIMARY KEY,
        configKey TEXT NOT NULL,
        configValue TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS groups (
        groupId TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        groupInfo TEXT,
        updatedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

-- Users table with cryptographically unique password hashing
CREATE TABLE
    IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phoneNumber TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        passwordSalt TEXT NOT NULL,
        cryptoHash TEXT UNIQUE NOT NULL,
        isAdmin BOOLEAN NOT NULL DEFAULT FALSE,
        credits REAL NOT NULL DEFAULT 0.0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phoneNumber);
CREATE INDEX IF NOT EXISTS idx_users_crypto_hash ON users (cryptoHash);

-- User sessions (instances) ownership
CREATE TABLE
    IF NOT EXISTS user_instances (
        userId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, sessionId),
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

-- Usage tracking for billing (per hour, excluding downtime)
CREATE TABLE
    IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        startTime TIMESTAMP NOT NULL,
        endTime TIMESTAMP,
        durationMinutes INTEGER DEFAULT 0,
        isDowntime BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs (userId);
CREATE INDEX IF NOT EXISTS idx_usage_logs_session ON usage_logs (sessionId);

-- Credit transactions
CREATE TABLE
    IF NOT EXISTS credit_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        amount REAL NOT NULL,
        transactionType TEXT NOT NULL,
        description TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions (userId);

-- Support requests
CREATE TABLE
    IF NOT EXISTS support_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_support_requests_user ON support_requests (userId);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests (status);
