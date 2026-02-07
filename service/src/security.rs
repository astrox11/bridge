use axum::{
    body::Body,
    extract::State,
    http::{header, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use hmac::{Hmac, Mac};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::sync::Arc;

use crate::AppState;

// ========== JWT Token Types ==========

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,           // User ID or crypto hash
    pub role: String,          // "user" or "admin"
    pub iat: i64,              // Issued at
    pub exp: i64,              // Expiration
    pub jti: String,           // JWT ID (unique token identifier)
    pub sid: String,           // Session ID
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

// ========== Encoded Response Types ==========

/// Obfuscated response codes instead of plain text messages
#[derive(Debug, Serialize, Clone)]
pub struct SecureResponse {
    #[serde(rename = "c")]
    pub code: u32,              // Response code
    #[serde(rename = "s")]
    pub status: u8,             // 0 = error, 1 = success
    #[serde(rename = "d")]
    pub data: Option<String>,   // Base64 encoded data
    #[serde(rename = "t")]
    pub timestamp: i64,         // Unix timestamp
    #[serde(rename = "sig")]
    pub signature: String,      // HMAC signature of the response
}

/// Response codes (obfuscated - not readable)
pub mod response_codes {
    pub const AUTH_SUCCESS: u32 = 0x1A3F;
    pub const AUTH_FAILED: u32 = 0x2B4E;
    pub const TOKEN_VALID: u32 = 0x3C5D;
    pub const TOKEN_INVALID: u32 = 0x4D6C;
    pub const TOKEN_EXPIRED: u32 = 0x5E7B;
    pub const ACCESS_DENIED: u32 = 0x6F8A;
    pub const ORIGIN_BLOCKED: u32 = 0x7099;
    pub const RATE_LIMITED: u32 = 0x81A8;
    pub const INVALID_REQUEST: u32 = 0x92B7;
    pub const USER_CREATED: u32 = 0xA3C6;
    pub const USER_EXISTS: u32 = 0xB4D5;
    pub const VALIDATION_ERROR: u32 = 0xC5E4;
    pub const INTERNAL_ERROR: u32 = 0xD6F3;
    pub const SESSION_CREATED: u32 = 0xE702;
    pub const OPERATION_OK: u32 = 0xF811;
    pub const PASSKEY_OK: u32 = 0x0920;
}

// ========== Security Configuration ==========

/// Get the JWT secret from environment
/// WARNING: In production, JWT_SECRET MUST be set to prevent token invalidation on restart
pub fn get_jwt_secret() -> String {
    match std::env::var("JWT_SECRET") {
        Ok(secret) => secret,
        Err(_) => {
            // Log warning in non-production
            eprintln!("WARNING: JWT_SECRET not set. Using random secret (tokens will be invalidated on restart)");
            let random_bytes: [u8; 32] = rand::random();
            hex::encode(random_bytes)
        }
    }
}

/// Get the API secret key for request signing
/// WARNING: In production, API_SECRET_KEY MUST be set
pub fn get_api_secret() -> String {
    match std::env::var("API_SECRET_KEY") {
        Ok(secret) => secret,
        Err(_) => {
            eprintln!("WARNING: API_SECRET_KEY not set. Using random secret.");
            let random_bytes: [u8; 32] = rand::random();
            hex::encode(random_bytes)
        }
    }
}

/// Get allowed origins for CORS and origin validation
pub fn get_allowed_origins() -> Vec<String> {
    std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost,http://127.0.0.1,https://localhost".to_string())
        .split(',')
        .map(|s| s.trim().to_string())
        .collect()
}

// ========== JWT Token Functions ==========

/// Generate a new access token
pub fn generate_access_token(user_id: &str, role: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now();
    let exp = now + chrono::Duration::hours(1); // 1 hour expiry
    let jti = uuid::Uuid::new_v4().to_string();
    let sid = uuid::Uuid::new_v4().to_string();

    let claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        iat: now.timestamp(),
        exp: exp.timestamp(),
        jti,
        sid,
    };

    let secret = get_jwt_secret();
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

/// Generate a refresh token (longer expiry)
pub fn generate_refresh_token(user_id: &str, role: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now();
    let exp = now + chrono::Duration::days(7); // 7 days expiry
    let jti = uuid::Uuid::new_v4().to_string();
    let sid = uuid::Uuid::new_v4().to_string();

    let claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        iat: now.timestamp(),
        exp: exp.timestamp(),
        jti,
        sid,
    };

    let secret = get_jwt_secret();
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

/// Generate both access and refresh tokens
pub fn generate_token_pair(user_id: &str, role: &str) -> Result<TokenPair, jsonwebtoken::errors::Error> {
    let access_token = generate_access_token(user_id, role)?;
    let refresh_token = generate_refresh_token(user_id, role)?;

    Ok(TokenPair {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600, // 1 hour in seconds
    })
}

/// Verify and decode a JWT token
pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let secret = get_jwt_secret();
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}

// ========== Response Signing ==========

/// Sign response data with HMAC
pub fn sign_response(data: &str) -> String {
    let secret = get_api_secret();
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(data.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

/// Create an obfuscated secure response
pub fn create_secure_response(code: u32, success: bool, data: Option<serde_json::Value>) -> SecureResponse {
    let timestamp = chrono::Utc::now().timestamp();
    
    // Encode data as base64 if present
    let encoded_data = data.map(|d| {
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, d.to_string())
    });
    
    // Create signature
    let sig_input = format!("{}{}{}{}", code, success as u8, encoded_data.as_deref().unwrap_or(""), timestamp);
    let signature = sign_response(&sig_input);
    
    SecureResponse {
        code,
        status: if success { 1 } else { 0 },
        data: encoded_data,
        timestamp,
        signature,
    }
}

// ========== Security Middleware ==========

/// Extract bearer token from Authorization header
fn extract_bearer_token(auth_header: &str) -> Option<&str> {
    if auth_header.starts_with("Bearer ") {
        Some(&auth_header[7..])
    } else {
        None
    }
}

/// JWT Authentication middleware
pub async fn jwt_auth_middleware(
    mut request: Request<Body>,
    next: Next,
) -> Response {
    // Skip auth for public routes
    let path = request.uri().path();
    let public_routes = [
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/admin",
        "/api/auth/passkey/login/challenge",
        "/api/auth/passkey/login",
        "/util/whatsapp-news",
    ];
    
    if public_routes.iter().any(|r| path.starts_with(r)) {
        return next.run(request).await;
    }
    
    // Also skip for static files
    if !path.starts_with("/api/") {
        return next.run(request).await;
    }
    
    // Check for Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());
    
    let token = match auth_header {
        Some(h) => match extract_bearer_token(h) {
            Some(t) => t,
            None => {
                return create_error_response(response_codes::TOKEN_INVALID);
            }
        },
        None => {
            // Check for token in cookie
            let cookie_header = request.headers().get(header::COOKIE);
            let cookie_token = cookie_header
                .and_then(|h| h.to_str().ok())
                .and_then(|cookies| {
                    cookies.split(';').find_map(|cookie| {
                        let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                        if parts.len() == 2 && parts[0] == "whatsaly_token" {
                            Some(parts[1])
                        } else {
                            None
                        }
                    })
                });
            
            match cookie_token {
                Some(t) => t,
                None => {
                    return create_error_response(response_codes::TOKEN_INVALID);
                }
            }
        }
    };
    
    // Verify token
    match verify_token(token) {
        Ok(claims) => {
            // Add claims to request extensions for later use
            request.extensions_mut().insert(claims);
            next.run(request).await
        }
        Err(e) => {
            if e.to_string().contains("ExpiredSignature") {
                create_error_response(response_codes::TOKEN_EXPIRED)
            } else {
                create_error_response(response_codes::TOKEN_INVALID)
            }
        }
    }
}

/// Origin validation middleware
pub async fn origin_validation_middleware(
    request: Request<Body>,
    next: Next,
) -> Response {
    let path = request.uri().path();
    
    // Skip origin check for static files and certain routes
    if !path.starts_with("/api/") {
        return next.run(request).await;
    }
    
    let allowed_origins = get_allowed_origins();
    
    // Check Origin header
    let origin = request
        .headers()
        .get(header::ORIGIN)
        .and_then(|h| h.to_str().ok());
    
    // Check Referer as fallback
    let referer = request
        .headers()
        .get(header::REFERER)
        .and_then(|h| h.to_str().ok())
        .and_then(|r| {
            // Extract origin from referer URL
            url::Url::parse(r).ok().map(|u| {
                let port = u.port().map(|p| format!(":{}", p)).unwrap_or_default();
                format!("{}://{}{}", u.scheme(), u.host_str().unwrap_or(""), port)
            })
        });
    
    // Validate origin
    let request_origin = origin.map(String::from).or(referer);
    
    match request_origin {
        Some(o) => {
            // Use exact matching to prevent bypass attacks (e.g., localhost.evil.com)
            let origin_matches = allowed_origins.iter().any(|allowed| {
                o == *allowed
            });
            
            if origin_matches {
                next.run(request).await
            } else {
                // For development, allow if no strict origin checking
                if std::env::var("STRICT_ORIGIN_CHECK").unwrap_or_default() == "true" {
                    create_error_response(response_codes::ORIGIN_BLOCKED)
                } else {
                    next.run(request).await
                }
            }
        }
        None => {
            // Allow requests without origin (server-to-server, curl, etc.) in dev
            if std::env::var("STRICT_ORIGIN_CHECK").unwrap_or_default() == "true" {
                create_error_response(response_codes::ORIGIN_BLOCKED)
            } else {
                next.run(request).await
            }
        }
    }
}

/// API key validation middleware
pub async fn api_key_middleware(
    request: Request<Body>,
    next: Next,
) -> Response {
    let path = request.uri().path();
    
    // Skip for non-API routes
    if !path.starts_with("/api/") {
        return next.run(request).await;
    }
    
    // Public routes don't need API key
    let public_routes = [
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/admin",
        "/api/auth/passkey",
    ];
    
    if public_routes.iter().any(|r| path.starts_with(r)) {
        return next.run(request).await;
    }
    
    // Check for X-API-Key header
    let api_key = request
        .headers()
        .get("X-API-Key")
        .and_then(|h| h.to_str().ok());
    
    let expected_key = get_api_secret();
    
    match api_key {
        Some(key) if constant_time_compare(key, &expected_key) => {
            next.run(request).await
        }
        _ => {
            // Allow if API key checking is not strictly enforced
            if std::env::var("REQUIRE_API_KEY").unwrap_or_default() == "true" {
                create_error_response(response_codes::ACCESS_DENIED)
            } else {
                next.run(request).await
            }
        }
    }
}

/// Constant-time string comparison
fn constant_time_compare(a: &str, b: &str) -> bool {
    let a_bytes = a.as_bytes();
    let b_bytes = b.as_bytes();
    
    if a_bytes.len() != b_bytes.len() {
        return false;
    }
    
    let mut result = 0u8;
    for (x, y) in a_bytes.iter().zip(b_bytes.iter()) {
        result |= x ^ y;
    }
    result == 0
}

/// Create an error response
fn create_error_response(code: u32) -> Response {
    let response = create_secure_response(code, false, None);
    (StatusCode::UNAUTHORIZED, Json(response)).into_response()
}

// ========== Cookie Helpers ==========

/// Create a secure cookie for the token
pub fn create_auth_cookie(token: &str, is_production: bool) -> String {
    let max_age = 3600; // 1 hour
    let mut cookie = format!(
        "whatsaly_token={}; Path=/; Max-Age={}; HttpOnly; SameSite=Strict",
        token, max_age
    );
    
    if is_production {
        cookie.push_str("; Secure");
    }
    
    cookie
}

/// Create a cookie to clear the auth token
pub fn create_logout_cookie() -> String {
    "whatsaly_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict".to_string()
}
