mod logger;
mod manager;
mod routes;
mod sql;

use crate::sql::Session;
use dotenv::dotenv;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub redis: redis::Client,
    pub sm: manager::SessionManager,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    logger::init();

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8080);

    logger::debug("INIT", "Connecting to SQLite database...");
    let pool = sql::sync_db().await;

    logger::debug("INIT", "Connecting to Redis...");
    let redis_client = redis::Client::open("redis://127.0.0.1/").unwrap();
    let (tx, _rx) = tokio::sync::broadcast::channel::<String>(1024);

    let manager = manager::SessionManager {
        workers: Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
        tx: tx.clone(),
    };

    let state = Arc::new(AppState {
        db: pool.clone(),
        redis: redis_client,
        sm: manager,
    });

    logger::debug("INIT", "Loading existing sessions...");
    let sessions: Vec<Session> = sqlx::query_as::<_, Session>("SELECT * FROM sessions")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let active_count = sessions.iter().filter(|s| s.status != "paused").count();
    let paused_count = sessions.len() - active_count;

    for session in sessions {
        if session.status == "paused" {
            let mut workers = state.sm.workers.write().await;
            workers.insert(
                session.id.clone(),
                manager::WorkerInfo {
                    phone: session.id.clone(),
                    status: "paused".to_string(),
                    pairing_code: None,
                    is_running: false,
                },
            );
            logger::debug("SESSION", &format!("{} (paused)", session.id));
            continue;
        }
        logger::info("SESSION", &format!("Starting {}", session.id));
        state.sm.start_instance(&session.id, state.clone()).await;
    }

    if active_count > 0 || paused_count > 0 {
        logger::success(
            "READY",
            &format!("{} active, {} paused", active_count, paused_count),
        );
    }

    let static_service = ServeDir::new("../ui/build");
    let app = routes::create_routes()
        .layer(CorsLayer::permissive())
        .with_state(state)
        .fallback_service(static_service);

    logger::banner(port);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
