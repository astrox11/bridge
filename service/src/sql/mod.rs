use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, sqlite::SqlitePool};

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct Session {
    pub id: String,
    pub status: String,
    pub name: Option<String>,
    #[sqlx(rename = "profileUrl")]
    pub profile_url: Option<String>,
    #[sqlx(rename = "isBusinessAccount")]
    pub is_business_account: bool,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct UserSettings {
    #[sqlx(rename = "sessionId")]
    pub session_id: String,
    #[sqlx(rename = "configKey")]
    pub config_key: String,
    #[sqlx(rename = "configValue")]
    pub config_value: Option<String>,
}

/// User account data - maps to users table
#[derive(Debug, FromRow, Serialize, Clone)]
pub struct User {
    pub id: String,
    #[sqlx(rename = "phoneNumber")]
    #[serde(rename = "phoneNumber")]
    pub phone_number: String,
    #[sqlx(rename = "passwordHash")]
    #[serde(skip_serializing)]
    pub password_hash: String,
    /// Unique salt for this user's password hash (for cryptographic uniqueness)
    #[sqlx(rename = "passwordSalt")]
    #[serde(skip_serializing)]
    #[allow(dead_code)]
    pub password_salt: String,
    #[sqlx(rename = "cryptoHash")]
    #[serde(rename = "cryptoHash")]
    pub crypto_hash: String,
    #[sqlx(rename = "isAdmin")]
    #[serde(rename = "isAdmin")]
    pub is_admin: bool,
    pub credits: f64,
    pub suspended: bool,
    #[sqlx(rename = "instanceLimit")]
    #[serde(rename = "instanceLimit")]
    pub instance_limit: i32,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

/// User instance mapping - links users to WhatsApp sessions
#[allow(dead_code)]
#[derive(Debug, FromRow, Serialize, Clone)]
pub struct UserInstance {
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: String,
    #[sqlx(rename = "sessionId")]
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct UsageLog {
    pub id: i64,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: String,
    #[sqlx(rename = "sessionId")]
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[sqlx(rename = "startTime")]
    #[serde(rename = "startTime")]
    pub start_time: DateTime<Utc>,
    #[sqlx(rename = "endTime")]
    #[serde(rename = "endTime")]
    pub end_time: Option<DateTime<Utc>>,
    #[sqlx(rename = "durationMinutes")]
    #[serde(rename = "durationMinutes")]
    pub duration_minutes: i32,
    #[sqlx(rename = "isDowntime")]
    #[serde(rename = "isDowntime")]
    pub is_downtime: bool,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct CreditTransaction {
    pub id: i64,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: String,
    pub amount: f64,
    #[sqlx(rename = "transactionType")]
    #[serde(rename = "transactionType")]
    pub transaction_type: String,
    pub description: Option<String>,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct SupportRequest {
    pub id: i64,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: String,
    pub email: String,
    pub subject: String,
    pub message: String,
    pub status: String,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    #[serde(rename = "phoneNumber")]
    pub phone_number: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    #[serde(rename = "phoneNumber")]
    pub phone_number: String,
    pub password: String,
    #[serde(rename = "cryptoHash")]
    pub crypto_hash: String,
}

/// Legacy auth response (deprecated - use SecureAuthResponse instead)
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<User>,
    #[serde(rename = "cryptoHash", skip_serializing_if = "Option::is_none")]
    pub crypto_hash: Option<String>,
}

/// Secure auth response with JWT tokens (obfuscated)
#[derive(Debug, Serialize)]
pub struct SecureAuthResponse {
    #[serde(rename = "c")]
    pub code: u32,
    #[serde(rename = "s")]
    pub status: u8,
    #[serde(rename = "tk", skip_serializing_if = "Option::is_none")]
    pub tokens: Option<TokenResponse>,
    #[serde(rename = "d", skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,  // Base64 encoded user data
    #[serde(rename = "t")]
    pub timestamp: i64,
    #[serde(rename = "sig")]
    pub signature: String,
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    #[serde(rename = "a")]
    pub access_token: String,
    #[serde(rename = "r")]
    pub refresh_token: String,
    #[serde(rename = "e")]
    pub expires_in: i64,
}

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct PasskeyCredential {
    pub id: String,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: String,
    #[sqlx(rename = "credentialId")]
    #[serde(rename = "credentialId")]
    pub credential_id: String,
    #[sqlx(rename = "publicKey")]
    #[serde(rename = "publicKey")]
    pub public_key: String,
    pub counter: i32,
    #[sqlx(rename = "deviceName")]
    #[serde(rename = "deviceName")]
    pub device_name: Option<String>,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "lastUsedAt")]
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct PasskeyRegisterRequest {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "credentialId")]
    pub credential_id: String,
    #[serde(rename = "publicKey")]
    pub public_key: String,
    #[serde(rename = "deviceName")]
    pub device_name: Option<String>,
}

/// Passkey login request - contains WebAuthn assertion data
#[derive(Debug, Deserialize)]
pub struct PasskeyLoginRequest {
    #[serde(rename = "credentialId")]
    pub credential_id: String,
    /// WebAuthn authenticator data (verified server-side)
    #[serde(rename = "authenticatorData")]
    #[allow(dead_code)]
    pub authenticator_data: String,
    /// Client data JSON (verified server-side for challenge)
    #[serde(rename = "clientDataJSON")]
    #[allow(dead_code)]
    pub client_data_json: String,
    /// Digital signature from authenticator (verified server-side)
    #[allow(dead_code)]
    pub signature: String,
}

use sqlx::sqlite::SqliteConnectOptions;
use std::fs;
use std::path::Path;
use std::str::FromStr;

pub async fn sync_db() -> SqlitePool {
    let database_url = "sqlite://database.db";

    let opts = SqliteConnectOptions::from_str(database_url)
        .expect("Invalid database URL")
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .synchronous(sqlx::sqlite::SqliteSynchronous::Off)
        .pragma("temp_store", "MEMORY")
        .pragma("mmap_size", "268435456")
        .pragma("cache_size", "-64000");

    let pool = SqlitePool::connect_with(opts)
        .await
        .expect("Failed to initialize SQLite database");

    let schema_path = "service/store/main.sql";

    if Path::new(schema_path).exists() {
        match fs::read_to_string(schema_path) {
            Ok(schema) => {
                if let Err(e) = sqlx::query(&schema).execute(&pool).await {
                    eprintln!("⚠️ Warning: Failed to execute schema from main.sql: {}", e);
                }
            }
            Err(e) => eprintln!("❌ Failed to read main.sql: {}", e),
        }
    } else {
        eprintln!(
            "⚠️ Warning: store/main.sql not found at {}. Skipping table init.",
            schema_path
        );
    }

    pool
}
