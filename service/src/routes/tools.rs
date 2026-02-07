use crate::sql::User;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Serialize)]
pub struct ToolInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub category: String,
}

/// Get available command tools for users
pub async fn get_available_tools(
    State(_state): State<Arc<AppState>>,
) -> (StatusCode, Json<serde_json::Value>) {
    let tools = vec![
        ToolInfo {
            id: "restart".to_string(),
            name: "Restart Instance".to_string(),
            description: "Restart your WhatsApp instance".to_string(),
            icon: "refresh".to_string(),
            category: "instance".to_string(),
        },
        ToolInfo {
            id: "pause".to_string(),
            name: "Pause Instance".to_string(),
            description: "Temporarily pause your instance".to_string(),
            icon: "pause".to_string(),
            category: "instance".to_string(),
        },
        ToolInfo {
            id: "resume".to_string(),
            name: "Resume Instance".to_string(),
            description: "Resume a paused instance".to_string(),
            icon: "play".to_string(),
            category: "instance".to_string(),
        },
        ToolInfo {
            id: "clear-cache".to_string(),
            name: "Clear Cache".to_string(),
            description: "Clear instance cache data".to_string(),
            icon: "trash".to_string(),
            category: "maintenance".to_string(),
        },
        ToolInfo {
            id: "sync-contacts".to_string(),
            name: "Sync Contacts".to_string(),
            description: "Force sync contacts from WhatsApp".to_string(),
            icon: "users".to_string(),
            category: "sync".to_string(),
        },
        ToolInfo {
            id: "export-data".to_string(),
            name: "Export Data".to_string(),
            description: "Export your instance data".to_string(),
            icon: "download".to_string(),
            category: "data".to_string(),
        },
        ToolInfo {
            id: "check-status".to_string(),
            name: "Check Status".to_string(),
            description: "Check instance connection status".to_string(),
            icon: "activity".to_string(),
            category: "diagnostics".to_string(),
        },
        ToolInfo {
            id: "reset-session".to_string(),
            name: "Reset Session".to_string(),
            description: "Reset and relink your device".to_string(),
            icon: "link".to_string(),
            category: "instance".to_string(),
        },
    ];

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "tools": tools
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct ExecuteToolRequest {
    #[serde(rename = "toolId")]
    pub tool_id: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    /// Additional parameters for the tool (reserved for future use)
    #[allow(dead_code)]
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ToolResult {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

/// Execute a command tool without text (one-click action)
pub async fn execute_tool(
    State(state): State<Arc<AppState>>,
    Path(crypto_hash): Path<String>,
    Json(payload): Json<ExecuteToolRequest>,
) -> (StatusCode, Json<ToolResult>) {
    // Verify user
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
                Json(ToolResult {
                    success: false,
                    message: "Invalid crypto hash".to_string(),
                    data: None,
                }),
            );
        }
    };

    // Verify user owns this session
    let owns_session: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM user_instances WHERE userId = ? AND sessionId = ?)"
    )
    .bind(&user.id)
    .bind(&payload.session_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !owns_session {
        return (
            StatusCode::FORBIDDEN,
            Json(ToolResult {
                success: false,
                message: "You don't have access to this instance".to_string(),
                data: None,
            }),
        );
    }

    // Execute the tool
    match payload.tool_id.as_str() {
        "restart" => execute_restart(&state, &payload.session_id).await,
        "pause" => execute_pause(&state, &payload.session_id).await,
        "resume" => execute_resume(&state, &payload.session_id).await,
        "clear-cache" => execute_clear_cache(&state, &payload.session_id).await,
        "sync-contacts" => execute_sync_contacts(&state, &payload.session_id).await,
        "export-data" => execute_export_data(&state, &payload.session_id).await,
        "check-status" => execute_check_status(&state, &payload.session_id).await,
        "reset-session" => execute_reset_session(&state, &payload.session_id).await,
        _ => (
            StatusCode::BAD_REQUEST,
            Json(ToolResult {
                success: false,
                message: format!("Unknown tool: {}", payload.tool_id),
                data: None,
            }),
        ),
    }
}

async fn execute_restart(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    // Stop and restart the instance
    state.sm.stop_instance(session_id).await;
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    let state_clone = state.clone();
    state.sm.start_instance(session_id, state_clone).await;

    (
        StatusCode::OK,
        Json(ToolResult {
            success: true,
            message: "Instance restarted successfully".to_string(),
            data: None,
        }),
    )
}

async fn execute_pause(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    state.sm.stop_instance(session_id).await;
    
    let _ = sqlx::query("UPDATE sessions SET status = 'paused' WHERE id = ?")
        .bind(session_id)
        .execute(&state.db)
        .await;

    // Update worker status
    let mut workers = state.sm.workers.write().await;
    if let Some(worker) = workers.get_mut(session_id) {
        worker.status = "paused".to_string();
        worker.is_running = false;
    }

    (
        StatusCode::OK,
        Json(ToolResult {
            success: true,
            message: "Instance paused".to_string(),
            data: None,
        }),
    )
}

async fn execute_resume(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    let state_clone = state.clone();
    state.sm.start_instance(session_id, state_clone).await;

    (
        StatusCode::OK,
        Json(ToolResult {
            success: true,
            message: "Instance resumed".to_string(),
            data: None,
        }),
    )
}

async fn execute_clear_cache(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    // Clear Redis cache for this session
    if let Ok(mut conn) = state.redis.get_connection() {
        let pattern = format!("session:{}:*", session_id);
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(&pattern)
            .query(&mut conn)
            .unwrap_or_default();
        
        for key in keys {
            let _ = redis::cmd("DEL").arg(&key).query::<()>(&mut conn);
        }
    }

    (
        StatusCode::OK,
        Json(ToolResult {
            success: true,
            message: "Cache cleared".to_string(),
            data: None,
        }),
    )
}

async fn execute_sync_contacts(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    // Trigger contact sync through the session manager
    let workers = state.sm.workers.read().await;
    if let Some(worker) = workers.get(session_id) {
        if worker.is_running {
            // Send sync command through broadcast
            let _ = state.sm.tx.send(format!("sync_contacts:{}", session_id));
            return (
                StatusCode::OK,
                Json(ToolResult {
                    success: true,
                    message: "Contact sync initiated".to_string(),
                    data: None,
                }),
            );
        }
    }

    (
        StatusCode::BAD_REQUEST,
        Json(ToolResult {
            success: false,
            message: "Instance is not running".to_string(),
            data: None,
        }),
    )
}

async fn execute_export_data(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    // Gather exportable data
    let contacts: Vec<(String, String)> = sqlx::query_as(
        "SELECT contactPn, contactLid FROM contacts WHERE sessionId = ?"
    )
    .bind(session_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let groups: Vec<(String, Option<String>)> = sqlx::query_as(
        "SELECT groupId, groupInfo FROM groups WHERE sessionId = ?"
    )
    .bind(session_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let export_data = serde_json::json!({
        "contacts": contacts.iter().map(|(pn, lid)| {
            serde_json::json!({ "phoneNumber": pn, "lid": lid })
        }).collect::<Vec<_>>(),
        "groups": groups.iter().map(|(id, info)| {
            serde_json::json!({ "groupId": id, "info": info })
        }).collect::<Vec<_>>(),
        "exportedAt": chrono::Utc::now().to_rfc3339()
    });

    (
        StatusCode::OK,
        Json(ToolResult {
            success: true,
            message: "Data exported".to_string(),
            data: Some(export_data),
        }),
    )
}

async fn execute_check_status(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    let workers = state.sm.workers.read().await;
    
    let status_data = if let Some(worker) = workers.get(session_id) {
        serde_json::json!({
            "isRunning": worker.is_running,
            "status": worker.status,
            "pid": worker.pid,
            "hasPairingCode": worker.pairing_code.is_some()
        })
    } else {
        serde_json::json!({
            "isRunning": false,
            "status": "not_found"
        })
    };

    (
        StatusCode::OK,
        Json(ToolResult {
            success: true,
            message: "Status retrieved".to_string(),
            data: Some(status_data),
        }),
    )
}

async fn execute_reset_session(state: &Arc<AppState>, session_id: &str) -> (StatusCode, Json<ToolResult>) {
    // Stop instance
    state.sm.stop_instance(session_id).await;

    // Clear session data
    let _ = sqlx::query("DELETE FROM tokens WHERE sessionId = ?")
        .bind(session_id)
        .execute(&state.db)
        .await;

    let _ = sqlx::query("UPDATE sessions SET status = 'logged_out' WHERE id = ?")
        .bind(session_id)
        .execute(&state.db)
        .await;

    // Clear Redis data
    if let Ok(mut conn) = state.redis.get_connection() {
        let pattern = format!("session:{}:*", session_id);
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(&pattern)
            .query(&mut conn)
            .unwrap_or_default();
        
        for key in keys {
            let _ = redis::cmd("DEL").arg(&key).query::<()>(&mut conn);
        }
    }

    (
        StatusCode::OK,
        Json(ToolResult {
            success: true,
            message: "Session reset. You can now relink your device.".to_string(),
            data: None,
        }),
    )
}

/// Quick action buttons (no text input required)
#[derive(Debug, Serialize)]
pub struct QuickAction {
    pub id: String,
    pub label: String,
    pub icon: String,
    pub color: String,
    pub confirm: bool,
}

pub async fn get_quick_actions() -> (StatusCode, Json<serde_json::Value>) {
    let actions = vec![
        QuickAction {
            id: "restart".to_string(),
            label: "Restart".to_string(),
            icon: "refresh-cw".to_string(),
            color: "blue".to_string(),
            confirm: true,
        },
        QuickAction {
            id: "pause".to_string(),
            label: "Pause".to_string(),
            icon: "pause".to_string(),
            color: "yellow".to_string(),
            confirm: true,
        },
        QuickAction {
            id: "resume".to_string(),
            label: "Resume".to_string(),
            icon: "play".to_string(),
            color: "green".to_string(),
            confirm: false,
        },
        QuickAction {
            id: "check-status".to_string(),
            label: "Status".to_string(),
            icon: "activity".to_string(),
            color: "gray".to_string(),
            confirm: false,
        },
    ];

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "actions": actions
        })),
    )
}
