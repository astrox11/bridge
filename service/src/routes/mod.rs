pub mod admin;
pub mod auth;
pub mod instance;
pub mod logs;
pub mod pair;
pub mod settings;
pub mod stats;
pub mod system;
pub mod tools;
pub mod user;
pub mod util;

use crate::AppState;
use axum::{
    Router,
    routing::{delete, get, patch, post},
};
use std::sync::Arc;

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Admin routes (existing - hidden technical workspace)
        .route("/api/instances", get(instance::list_instances))
        .route("/api/instances/stream", get(instance::instance_stream))
        .route("/api/instances/:phone", get(instance::get_instance))
        .route(
            "/api/instances/:phone/start",
            post(instance::start_instance),
        )
        .route(
            "/api/instances/:phone/pause",
            post(instance::pause_instance),
        )
        .route(
            "/api/instances/:phone/resume",
            post(instance::resume_instance),
        )
        .route(
            "/api/instances/:phone/reset",
            post(instance::reset_instance),
        )
        .route(
            "/api/instances/:phone/stats",
            get(stats::get_instance_stats),
        )
        .route("/api/instances/:phone/pair", post(pair::pair_instance))
        .route("/api/settings/:phone", get(settings::get_settings))
        .route("/api/settings/:phone", patch(settings::update_setting))
        .route("/api/system/stream", get(system::system_stream))
        .route("/api/logs/stream", get(logs::logs_stream))
        .route("/util/whatsapp-news", get(util::get_whatsapp_news))
        // Authentication routes
        .route("/api/auth/register", post(auth::register))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/admin", post(auth::admin_login))
        .route(
            "/api/auth/admin/validate",
            get(auth::validate_admin_session),
        )
        .route(
            "/api/dashboard/user/cryptooooooohash/:phone",
            get(auth::get_crypto_hash),
        )
        .route(
            "/api/auth/verify/:crypto_hash",
            get(auth::verify_crypto_hash),
        )
        // Passkey (WebAuthn) routes
        .route(
            "/api/auth/passkey/register/challenge/:user_id",
            get(auth::passkey_register_challenge),
        )
        .route("/api/auth/passkey/register", post(auth::passkey_register))
        .route(
            "/api/auth/passkey/login/challenge",
            get(auth::passkey_login_challenge),
        )
        .route("/api/auth/passkey/login", post(auth::passkey_login))
        .route("/api/auth/passkey/:user_id", get(auth::get_passkeys))
        .route(
            "/api/auth/passkey/:user_id/:passkey_id",
            delete(auth::delete_passkey),
        )
        // User dashboard routes
        .route(
            "/api/user/:crypto_hash/dashboard",
            get(user::get_user_dashboard),
        )
        .route(
            "/api/user/:crypto_hash/instances",
            get(user::get_user_instances),
        )
        .route(
            "/api/user/:crypto_hash/instances",
            post(user::create_user_instance),
        )
        .route(
            "/api/user/:crypto_hash/instances/:session_id/pairing",
            get(user::get_instance_pairing_code),
        )
        .route(
            "/api/user/:crypto_hash/credits",
            get(user::get_user_credits),
        )
        .route(
            "/api/user/:crypto_hash/credits/add",
            post(user::add_credits),
        )
        .route("/api/user/:crypto_hash/usage", get(user::get_usage_history))
        .route(
            "/api/user/:crypto_hash/support",
            get(user::get_support_requests),
        )
        .route(
            "/api/user/:crypto_hash/support",
            post(user::submit_support_request),
        )
        // User command tools (no text input required)
        .route("/api/tools", get(tools::get_available_tools))
        .route("/api/tools/quick-actions", get(tools::get_quick_actions))
        .route(
            "/api/user/:crypto_hash/tools/execute",
            post(tools::execute_tool),
        )
        // Admin management routes
        .route("/api/admin/users", get(admin::list_users))
        .route(
            "/api/admin/users/:user_id/billing",
            get(admin::get_user_billing),
        )
        .route(
            "/api/admin/users/:user_id/suspend",
            post(admin::suspend_user),
        )
        .route(
            "/api/admin/users/:user_id/limit",
            post(admin::set_user_limit),
        )
        .route("/api/admin/users/:user_id", delete(admin::delete_user))
        .route(
            "/api/admin/instances/grouped",
            get(admin::get_grouped_instances),
        )
        .route("/api/admin/support", get(admin::list_support_requests))
        .route(
            "/api/admin/support/:request_id",
            patch(admin::update_support_request),
        )
}
