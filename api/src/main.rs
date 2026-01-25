mod manager;
mod routes;
mod sql;

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
    let pool = sql::sync_db().await;
    let redis_client = redis::Client::open("redis://127.0.0.1/").unwrap();

    let (tx, _rx) = tokio::sync::broadcast::channel::<String>(1024);

    let manager = manager::SessionManager {
        workers: Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
        tx: tx.clone(), // This tx is now shared by everything
    };

    let state = Arc::new(AppState {
        db: pool,
        redis: redis_client,
        sm: manager,
    });
    let static_service = ServeDir::new("../interface");

    let app = routes::create_routes()
        .layer(CorsLayer::permissive())
        .with_state(state)
        .fallback_service(static_service);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Whatsaly listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
