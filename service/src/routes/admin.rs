use crate::AppState;
use crate::sql::{SupportRequest, User};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// User with instance details for admin view
#[derive(Debug, Serialize)]
pub struct UserWithStats {
    pub id: String,
    #[serde(rename = "phoneNumber")]
    pub phone_number: String,
    pub credits: f64,
    pub suspended: bool,
    #[serde(rename = "instanceLimit")]
    pub instance_limit: i32,
    #[serde(rename = "createdAt")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(rename = "instanceCount")]
    pub instance_count: i64,
    #[serde(rename = "totalUsageMinutes")]
    pub total_usage_minutes: i64,
}

/// List all users (admin only)
pub async fn list_users(
    State(state): State<Arc<AppState>>,
) -> (StatusCode, Json<serde_json::Value>) {
    let users: Vec<User> = sqlx::query_as("SELECT * FROM users ORDER BY createdAt DESC")
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    let mut users_with_stats = Vec::new();

    for user in users {
        // Get instance count
        let instance_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM user_instances WHERE userId = ?")
                .bind(&user.id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

        // Get total usage
        let total_usage: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(durationMinutes), 0) FROM usage_logs WHERE userId = ? AND isDowntime = FALSE"
        )
        .bind(&user.id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        users_with_stats.push(UserWithStats {
            id: user.id,
            phone_number: user.phone_number,
            credits: user.credits,
            suspended: user.suspended,
            instance_limit: user.instance_limit,
            created_at: user.created_at,
            instance_count,
            total_usage_minutes: total_usage,
        });
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "users": users_with_stats
        })),
    )
}

/// Get user details with billing info (admin only)
pub async fn get_user_billing(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    let user = match user {
        Some(u) => u,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "User not found"
                })),
            );
        }
    };

    // Get instances
    let instances: Vec<(
        String,
        String,
        Option<String>,
        chrono::DateTime<chrono::Utc>,
    )> = sqlx::query_as(
        "SELECT ui.sessionId, s.status, s.name, ui.createdAt 
         FROM user_instances ui 
         JOIN sessions s ON ui.sessionId = s.id 
         WHERE ui.userId = ?",
    )
    .bind(&user.id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // Get usage per instance
    let mut instances_with_usage = Vec::new();
    for (session_id, status, name, created_at) in instances {
        let usage: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(durationMinutes), 0) FROM usage_logs 
             WHERE sessionId = ? AND isDowntime = FALSE",
        )
        .bind(&session_id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        instances_with_usage.push(serde_json::json!({
            "sessionId": session_id,
            "status": status,
            "name": name,
            "createdAt": created_at,
            "usageMinutes": usage,
            "cost": (usage as f64 / 60.0) * 0.10
        }));
    }

    // Get credit transactions
    let transactions: Vec<(f64, String, Option<String>, chrono::DateTime<chrono::Utc>)> =
        sqlx::query_as(
            "SELECT amount, transactionType, description, createdAt 
         FROM credit_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 20",
        )
        .bind(&user.id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    let transactions_json: Vec<serde_json::Value> = transactions
        .iter()
        .map(|(amount, tx_type, desc, created_at)| {
            serde_json::json!({
                "amount": amount,
                "type": tx_type,
                "description": desc,
                "createdAt": created_at
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "user": {
                "id": user.id,
                "phoneNumber": user.phone_number,
                "credits": user.credits,
                "suspended": user.suspended,
                "instanceLimit": user.instance_limit,
                "createdAt": user.created_at
            },
            "instances": instances_with_usage,
            "transactions": transactions_json
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct SuspendUserRequest {
    pub suspended: bool,
}

/// Suspend or unsuspend a user (admin only)
pub async fn suspend_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
    Json(payload): Json<SuspendUserRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let result = sqlx::query("UPDATE users SET suspended = ?, updatedAt = ? WHERE id = ?")
        .bind(payload.suspended)
        .bind(chrono::Utc::now())
        .bind(&user_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": if payload.suspended { "User suspended" } else { "User unsuspended" }
            })),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "User not found"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update user: {}", e)
            })),
        ),
    }
}

#[derive(Debug, Deserialize)]
pub struct LimitUserRequest {
    pub limit: i32,
}

/// Set instance limit for a user (admin only)
pub async fn set_user_limit(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
    Json(payload): Json<LimitUserRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let result = sqlx::query("UPDATE users SET instanceLimit = ?, updatedAt = ? WHERE id = ?")
        .bind(payload.limit)
        .bind(chrono::Utc::now())
        .bind(&user_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": format!("Instance limit set to {}", payload.limit)
            })),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "User not found"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update user: {}", e)
            })),
        ),
    }
}

/// Delete a user account (admin only)
pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    // First delete user's instances
    let _ = sqlx::query(
        "DELETE FROM sessions WHERE id IN (SELECT sessionId FROM user_instances WHERE userId = ?)",
    )
    .bind(&user_id)
    .execute(&state.db)
    .await;

    // Delete user (cascades to user_instances, support_requests, etc.)
    let result = sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(&user_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "User deleted successfully"
            })),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "User not found"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to delete user: {}", e)
            })),
        ),
    }
}

/// Instance info with owner
#[derive(Debug, Serialize)]
pub struct InstanceWithOwner {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub name: Option<String>,
    pub status: String,
    #[serde(rename = "phoneNumber")]
    pub phone_number: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
    #[serde(rename = "userPhone")]
    pub user_phone: Option<String>,
}

/// User group with instances
#[derive(Debug, Serialize)]
pub struct UserInstanceGroup {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "userPhone")]
    pub user_phone: String,
    pub instances: Vec<InstanceWithOwner>,
}

/// Get all instances grouped by user (admin only)
pub async fn get_grouped_instances(
    State(state): State<Arc<AppState>>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Get all instances with user info
    let instances: Vec<(String, Option<String>, String, Option<String>, chrono::DateTime<chrono::Utc>, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT s.id, s.name, s.status, s.phoneNumber, s.createdAt, ui.userId, u.phoneNumber as userPhone
         FROM sessions s
         LEFT JOIN user_instances ui ON s.id = ui.sessionId
         LEFT JOIN users u ON ui.userId = u.id
         ORDER BY ui.userId, s.createdAt DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // Group by user
    let mut user_groups: std::collections::HashMap<String, Vec<InstanceWithOwner>> =
        std::collections::HashMap::new();
    let mut user_phones: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut orphan_instances: Vec<InstanceWithOwner> = Vec::new();

    for (session_id, name, status, phone_number, created_at, user_id, user_phone) in instances {
        let instance = InstanceWithOwner {
            session_id,
            name,
            status,
            phone_number,
            created_at,
            user_id: user_id.clone(),
            user_phone: user_phone.clone(),
        };

        if let Some(uid) = user_id {
            user_groups.entry(uid.clone()).or_default().push(instance);
            if let Some(phone) = user_phone {
                user_phones.insert(uid, phone);
            }
        } else {
            orphan_instances.push(instance);
        }
    }

    // Convert to groups
    let groups: Vec<UserInstanceGroup> = user_groups
        .into_iter()
        .map(|(user_id, instances)| UserInstanceGroup {
            user_phone: user_phones
                .get(&user_id)
                .cloned()
                .unwrap_or_else(|| "Unknown".to_string()),
            user_id,
            instances,
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "groups": groups,
            "orphanInstances": orphan_instances
        })),
    )
}

/// Get all support requests (admin only)
pub async fn list_support_requests(
    State(state): State<Arc<AppState>>,
) -> (StatusCode, Json<serde_json::Value>) {
    let requests: Vec<SupportRequest> =
        sqlx::query_as("SELECT * FROM support_requests ORDER BY createdAt DESC")
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
pub struct UpdateSupportRequest {
    pub status: String,
}

/// Update support request status (admin only)
pub async fn update_support_request(
    State(state): State<Arc<AppState>>,
    Path(request_id): Path<i64>,
    Json(payload): Json<UpdateSupportRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let result = sqlx::query("UPDATE support_requests SET status = ?, updatedAt = ? WHERE id = ?")
        .bind(&payload.status)
        .bind(chrono::Utc::now())
        .bind(request_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": format!("Request status updated to {}", payload.status)
            })),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Request not found"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update request: {}", e)
            })),
        ),
    }
}
