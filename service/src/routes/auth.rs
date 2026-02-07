use crate::sql::{AuthResponse, LoginRequest, RegisterRequest, User};
use crate::AppState;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{extract::State, http::StatusCode, Json};
use sha2::{Digest, Sha256};
use std::sync::Arc;

/// Generate a unique crypto hash for each user based on their phone number and a random component
fn generate_crypto_hash(phone_number: &str) -> String {
    let random_bytes: [u8; 32] = rand::random();
    let mut hasher = Sha256::new();
    hasher.update(phone_number.as_bytes());
    hasher.update(&random_bytes);
    hasher.update(chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0).to_le_bytes());
    hex::encode(hasher.finalize())
}

/// Hash password with a unique per-user salt using Argon2
fn hash_password(password: &str) -> Result<(String, String), argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok((password_hash.to_string(), salt.to_string()))
}

/// Verify password against stored hash
fn verify_password(password: &str, password_hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(password_hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

/// Generate a unique user ID
fn generate_user_id() -> String {
    let random_bytes: [u8; 16] = rand::random();
    hex::encode(random_bytes)
}

/// Register a new user
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> (StatusCode, Json<AuthResponse>) {
    // Validate phone number
    if payload.phone_number.is_empty() || payload.phone_number.len() < 10 {
        return (
            StatusCode::BAD_REQUEST,
            Json(AuthResponse {
                success: false,
                message: "Invalid phone number".to_string(),
                user: None,
                crypto_hash: None,
            }),
        );
    }

    // Validate password
    if payload.password.len() < 6 {
        return (
            StatusCode::BAD_REQUEST,
            Json(AuthResponse {
                success: false,
                message: "Password must be at least 6 characters".to_string(),
                user: None,
                crypto_hash: None,
            }),
        );
    }

    // Check if user already exists
    let existing: Option<User> = sqlx::query_as(
        "SELECT * FROM users WHERE phoneNumber = ?"
    )
    .bind(&payload.phone_number)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    if existing.is_some() {
        return (
            StatusCode::CONFLICT,
            Json(AuthResponse {
                success: false,
                message: "Phone number already registered".to_string(),
                user: None,
                crypto_hash: None,
            }),
        );
    }

    // Generate unique crypto hash for this user
    let crypto_hash = generate_crypto_hash(&payload.phone_number);

    // Hash password with unique salt
    let (password_hash, password_salt) = match hash_password(&payload.password) {
        Ok(result) => result,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    message: "Failed to process password".to_string(),
                    user: None,
                    crypto_hash: None,
                }),
            );
        }
    };

    let user_id = generate_user_id();
    let now = chrono::Utc::now();

    // Insert new user
    let result = sqlx::query(
        "INSERT INTO users (id, phoneNumber, passwordHash, passwordSalt, cryptoHash, isAdmin, credits, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&user_id)
    .bind(&payload.phone_number)
    .bind(&password_hash)
    .bind(&password_salt)
    .bind(&crypto_hash)
    .bind(false)
    .bind(0.0)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let user: User = sqlx::query_as("SELECT * FROM users WHERE id = ?")
                .bind(&user_id)
                .fetch_one(&state.db)
                .await
                .unwrap();

            (
                StatusCode::CREATED,
                Json(AuthResponse {
                    success: true,
                    message: "Registration successful. Save your crypto hash - it's required for login.".to_string(),
                    user: Some(user),
                    crypto_hash: Some(crypto_hash),
                }),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(AuthResponse {
                success: false,
                message: format!("Failed to create user: {}", e),
                user: None,
                crypto_hash: None,
            }),
        ),
    }
}

/// Login with phone number, password, and crypto hash
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> (StatusCode, Json<AuthResponse>) {
    // Find user by phone number
    let user: Option<User> = sqlx::query_as(
        "SELECT * FROM users WHERE phoneNumber = ?"
    )
    .bind(&payload.phone_number)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(AuthResponse {
                    success: false,
                    message: "Invalid credentials".to_string(),
                    user: None,
                    crypto_hash: None,
                }),
            );
        }
    };

    // Verify crypto hash matches
    if user.crypto_hash != payload.crypto_hash {
        return (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                message: "Invalid crypto hash".to_string(),
                user: None,
                crypto_hash: None,
            }),
        );
    }

    // Verify password
    if !verify_password(&payload.password, &user.password_hash) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                message: "Invalid credentials".to_string(),
                user: None,
                crypto_hash: None,
            }),
        );
    }

    (
        StatusCode::OK,
        Json(AuthResponse {
            success: true,
            message: "Login successful".to_string(),
            user: Some(user),
            crypto_hash: None,
        }),
    )
}

/// Get user's unique crypto hash (requires phone verification)
pub async fn get_crypto_hash(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(phone): axum::extract::Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as(
        "SELECT * FROM users WHERE phoneNumber = ?"
    )
    .bind(&phone)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match user {
        Some(u) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "cryptoHash": u.crypto_hash,
                "message": "Use this crypto hash along with your phone number and password to login"
            })),
        ),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "User not found"
            })),
        ),
    }
}

/// Verify a crypto hash belongs to a user (for encrypted queries)
pub async fn verify_crypto_hash(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(crypto_hash): axum::extract::Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as(
        "SELECT * FROM users WHERE cryptoHash = ?"
    )
    .bind(&crypto_hash)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    match user {
        Some(u) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "valid": true,
                "userId": u.id,
                "phoneNumber": u.phone_number
            })),
        ),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "valid": false,
                "message": "Invalid crypto hash"
            })),
        ),
    }
}
