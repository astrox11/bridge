use crate::AppState;
use crate::sql::{CreditTransaction, SupportRequest, UsageLog, User};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// User dashboard data response type (used in API responses)
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct UserDashboard {
    pub user: User,
    pub instances: Vec<UserInstanceInfo>,
    #[serde(rename = "totalUsageMinutes")]
    pub total_usage_minutes: i64,
    #[serde(rename = "monthlyUsageMinutes")]
    pub monthly_usage_minutes: i64,
    #[serde(rename = "creditsUsed")]
    pub credits_used: f64,
}

#[derive(Debug, Serialize)]
pub struct UserInstanceInfo {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub status: String,
    pub name: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Get user dashboard data
pub async fn get_user_dashboard(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Find user by crypto hash
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    // Get user's instances
    let instances: Vec<UserInstanceInfo> = sqlx::query_as::<
        _,
        (
            String,
            String,
            Option<String>,
            chrono::DateTime<chrono::Utc>,
        ),
    >(
        "SELECT ui.sessionId, s.status, s.name, ui.createdAt 
         FROM user_instances ui 
         JOIN sessions s ON ui.sessionId = s.id 
         WHERE ui.userId = ?",
    )
    .bind(&user.id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(session_id, status, name, created_at)| UserInstanceInfo {
        session_id,
        status,
        name,
        created_at,
    })
    .collect();

    // Calculate total usage (excluding downtime)
    let total_usage: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(durationMinutes), 0) FROM usage_logs 
         WHERE userId = ? AND isDowntime = FALSE",
    )
    .bind(&user.id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    // Calculate monthly usage
    let start_of_month = chrono::Utc::now()
        .date_naive()
        .with_day(1)
        .unwrap()
        .and_hms_opt(0, 0, 0)
        .unwrap();

    let monthly_usage: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(durationMinutes), 0) FROM usage_logs 
         WHERE userId = ? AND isDowntime = FALSE AND startTime >= ?",
    )
    .bind(&user.id)
    .bind(start_of_month)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    // Calculate credits used (based on hourly rate)
    let hourly_rate = 0.10; // $0.10 per hour
    let credits_used = (monthly_usage as f64 / 60.0) * hourly_rate;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "data": {
                "user": user,
                "instances": instances,
                "totalUsageMinutes": total_usage,
                "monthlyUsageMinutes": monthly_usage,
                "creditsUsed": credits_used
            }
        })),
    )
}

/// Get user's instances
pub async fn get_user_instances(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    let instances: Vec<UserInstanceInfo> = sqlx::query_as::<
        _,
        (
            String,
            String,
            Option<String>,
            chrono::DateTime<chrono::Utc>,
        ),
    >(
        "SELECT ui.sessionId, s.status, s.name, ui.createdAt 
         FROM user_instances ui 
         JOIN sessions s ON ui.sessionId = s.id 
         WHERE ui.userId = ?",
    )
    .bind(&user.id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(session_id, status, name, created_at)| UserInstanceInfo {
        session_id,
        status,
        name,
        created_at,
    })
    .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "instances": instances
        })),
    )
}

/// Get user's credit balance and transactions
pub async fn get_user_credits(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    let transactions: Vec<CreditTransaction> = sqlx::query_as(
        "SELECT * FROM credit_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
    )
    .bind(&user.id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "balance": user.credits,
            "transactions": transactions
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct AddCreditsRequest {
    pub amount: f64,
    pub description: Option<String>,
}

/// Add credits to user account (admin or payment gateway callback)
pub async fn add_credits(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
    Json(payload): Json<AddCreditsRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    if payload.amount <= 0.0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Amount must be positive"
            })),
        );
    }

    let new_balance = user.credits + payload.amount;
    let now = chrono::Utc::now();

    // Update user credits
    let _ = sqlx::query("UPDATE users SET credits = ?, updatedAt = ? WHERE id = ?")
        .bind(new_balance)
        .bind(now)
        .bind(&user.id)
        .execute(&state.db)
        .await;

    // Record transaction
    let _ = sqlx::query(
        "INSERT INTO credit_transactions (userId, amount, transactionType, description, createdAt) 
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&user.id)
    .bind(payload.amount)
    .bind("credit")
    .bind(
        payload
            .description
            .unwrap_or_else(|| "Credit added".to_string()),
    )
    .bind(now)
    .execute(&state.db)
    .await;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "newBalance": new_balance
        })),
    )
}

/// Get user's usage history
pub async fn get_usage_history(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    let usage: Vec<UsageLog> = sqlx::query_as(
        "SELECT * FROM usage_logs WHERE userId = ? ORDER BY startTime DESC LIMIT 100",
    )
    .bind(&user.id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // Calculate summary
    let total_active: i64 = usage
        .iter()
        .filter(|u| !u.is_downtime)
        .map(|u| u.duration_minutes as i64)
        .sum();
    let total_downtime: i64 = usage
        .iter()
        .filter(|u| u.is_downtime)
        .map(|u| u.duration_minutes as i64)
        .sum();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "usage": usage,
            "summary": {
                "totalActiveMinutes": total_active,
                "totalDowntimeMinutes": total_downtime,
                "billableHours": total_active as f64 / 60.0
            }
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct SupportRequestPayload {
    pub email: String,
    pub subject: String,
    pub message: String,
}

/// Submit a support request
pub async fn submit_support_request(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
    Json(payload): Json<SupportRequestPayload>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    if payload.email.is_empty() || payload.subject.is_empty() || payload.message.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Email, subject and message are required"
            })),
        );
    }

    let now = chrono::Utc::now();

    let result = sqlx::query(
        "INSERT INTO support_requests (userId, email, subject, message, status, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&user.id)
    .bind(&payload.email)
    .bind(&payload.subject)
    .bind(&payload.message)
    .bind("open")
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => (
            StatusCode::CREATED,
            Json(serde_json::json!({
                "success": true,
                "message": "Support request submitted successfully"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to submit request: {}", e)
            })),
        ),
    }
}

/// Get user's support requests
pub async fn get_support_requests(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    let requests: Vec<SupportRequest> =
        sqlx::query_as("SELECT * FROM support_requests WHERE userId = ? ORDER BY createdAt DESC")
            .bind(&user.id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "requests": requests
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct CreateInstanceRequest {
    #[serde(rename = "phoneNumber")]
    pub phone_number: String,
    pub name: Option<String>,
}

/// Create a new instance for user (max 1 per phone number)
pub async fn create_user_instance(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
    Json(payload): Json<CreateInstanceRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Find user by crypto hash
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    // Check if user is limited from creating instances
    if user.instance_limit == 0 {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "You are not allowed to create instances. Contact support."
            })),
        );
    }

    // Check if user is suspended
    if user.suspended {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Your account is suspended. Contact support."
            })),
        );
    }

    // Clean phone number - remove + and non-digit characters
    let clean_phone: String = payload
        .phone_number
        .chars()
        .filter(|c| c.is_ascii_digit())
        .collect();

    if clean_phone.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Invalid phone number"
            })),
        );
    }

    // Check if user already has an instance for this phone number
    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT ui.sessionId FROM user_instances ui 
         JOIN sessions s ON ui.sessionId = s.id 
         WHERE ui.userId = ? AND s.phoneNumber = ?",
    )
    .bind(&user.id)
    .bind(&clean_phone)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    if existing.is_some() {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "success": false,
                "message": "You already have an instance for this phone number"
            })),
        );
    }

    // Check total instance count against limit
    let instance_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM user_instances WHERE userId = ?")
            .bind(&user.id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    if instance_count >= user.instance_limit as i64 {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": format!("You have reached your instance limit of {}", user.instance_limit)
            })),
        );
    }

    // Use the clean phone number as session ID for the WhatsApp pairing
    // This is what the bot client uses to request pairing codes
    let session_id = clean_phone.clone();
    let now = chrono::Utc::now();

    // Create session in sessions table
    let session_result = sqlx::query(
        "INSERT INTO sessions (id, name, status, phoneNumber, ownerCryptoHash, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&session_id)
    .bind(payload.name.as_deref().unwrap_or("New Instance"))
    .bind("starting")
    .bind(&clean_phone)
    .bind(&crypto_hash)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    if let Err(e) = session_result {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to create session: {}", e)
            })),
        );
    }

    // Link session to user
    let link_result =
        sqlx::query("INSERT INTO user_instances (userId, sessionId, createdAt) VALUES (?, ?, ?)")
            .bind(&user.id)
            .bind(&session_id)
            .bind(now)
            .execute(&state.db)
            .await;

    if let Err(e) = link_result {
        // Rollback session creation
        let _ = sqlx::query("DELETE FROM sessions WHERE id = ?")
            .bind(&session_id)
            .execute(&state.db)
            .await;

        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to link instance: {}", e)
            })),
        );
    }

    // Start the instance to generate pairing code
    state.sm.start_instance(&session_id, state.clone()).await;

    (
        StatusCode::CREATED,
        Json(serde_json::json!({
            "success": true,
            "message": "Instance created and starting. Please wait for pairing code.",
            "sessionId": session_id,
            "phoneNumber": clean_phone
        })),
    )
}

/// Get pairing code for a specific session
pub async fn get_instance_pairing_code(
    State(state): State<Arc<AppState>>,
    Path((crypto_hash, session_id)): Path<(String, String)>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Verify user owns this instance
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE cryptoHash = ?")
        .bind(&crypto_hash)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid crypto hash"
                })),
            );
        }
    };

    // Check if user owns this session
    let owns_session: Option<(String,)> =
        sqlx::query_as("SELECT sessionId FROM user_instances WHERE userId = ? AND sessionId = ?")
            .bind(&user.id)
            .bind(&session_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);

    if owns_session.is_none() {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "You don't own this instance"
            })),
        );
    }

    // Get worker info to check for pairing code
    let workers = state.sm.workers.read().await;
    if let Some(worker) = workers.get(&session_id) {
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "sessionId": session_id,
                "status": worker.status,
                "pairingCode": worker.pairing_code,
                "isRunning": worker.is_running
            })),
        );
    }

    // No worker found, check database for status
    let session: Option<(String, String)> =
        sqlx::query_as("SELECT id, status FROM sessions WHERE id = ?")
            .bind(&session_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);

    match session {
        Some((_, status)) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "sessionId": session_id,
                "status": status,
                "pairingCode": null,
                "isRunning": false
            })),
        ),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Session not found"
            })),
        ),
    }
}
