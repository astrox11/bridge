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

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct User {
    pub id: String,
    #[sqlx(rename = "phoneNumber")]
    #[serde(rename = "phoneNumber")]
    pub phone_number: String,
    #[sqlx(rename = "passwordHash")]
    #[serde(skip_serializing)]
    pub password_hash: String,
    #[sqlx(rename = "passwordSalt")]
    #[serde(skip_serializing)]
    pub password_salt: String,
    #[sqlx(rename = "cryptoHash")]
    #[serde(rename = "cryptoHash")]
    pub crypto_hash: String,
    #[sqlx(rename = "isAdmin")]
    #[serde(rename = "isAdmin")]
    pub is_admin: bool,
    pub credits: f64,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

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

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<User>,
    #[serde(rename = "cryptoHash", skip_serializing_if = "Option::is_none")]
    pub crypto_hash: Option<String>,
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

#[derive(Debug, Deserialize)]
pub struct PasskeyLoginRequest {
    #[serde(rename = "credentialId")]
    pub credential_id: String,
    #[serde(rename = "authenticatorData")]
    pub authenticator_data: String,
    #[serde(rename = "clientDataJSON")]
    pub client_data_json: String,
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
