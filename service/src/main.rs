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
    pub log_tx: tokio::sync::broadcast::Sender<String>,
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

    let mut redis_connected = match redis_client.get_connection() {
        Ok(mut conn) => redis::cmd("PING").query::<String>(&mut conn).is_ok(),
        Err(_) => false,
    };

    if !redis_connected {
        if cfg!(windows) {
            logger::info("REDIS", "Starting WSL...");

            tokio::spawn(async {
                loop {
                    let _ = tokio::process::Command::new("wsl")
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .spawn();

                    tokio::time::sleep(std::time::Duration::from_secs(30)).await;
                }
            });

            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        } else {
            logger::info("REDIS", "Starting redis-server...");
            let redis_conf_path = std::env::current_dir()
                .map(|p| p.join("redis.conf"))
                .unwrap_or_else(|_| std::path::PathBuf::from("redis.conf"));

            let mut cmd = tokio::process::Command::new("redis-server");
            if redis_conf_path.exists() {
                cmd.arg(&redis_conf_path);
            } else {
                cmd.args(["--maxmemory", "20mb", "--maxmemory-policy", "allkeys-lru"]);
            }

            match cmd.spawn() {
                Ok(_) => {
                    logger::info("REDIS", "Spawned redis-server, waiting for readiness...");
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                }
                Err(e) => {
                    logger::error("REDIS", &format!("Failed to execute redis-server: {}", e));
                    std::process::exit(1);
                }
            }
        };
        redis_connected = match redis_client.get_connection() {
            Ok(mut conn) => redis::cmd("PING").query::<String>(&mut conn).is_ok(),
            Err(_) => false,
        };

        if redis_connected {
            logger::success("REDIS", "Connected successfully");

            let mut conn = redis_client.get_connection().unwrap();
            let _: () = redis::cmd("MEMORY")
                .arg("PURGE")
                .query(&mut conn)
                .unwrap_or(());

            logger::debug("REDIS", "Memory purge triggered to reduce RSS overhead");
        } else {
            logger::error("REDIS", "Could not start or connect to Redis service");
            std::process::exit(1);
        }
    } else {
        logger::success("REDIS", "Connected");
    }

    let (tx, _rx) = tokio::sync::broadcast::channel::<String>(1024);
    let (log_tx, _) = tokio::sync::broadcast::channel::<String>(256);
    logger::set_broadcast(log_tx.clone());

    let manager = manager::SessionManager {
        workers: Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
        tx: tx.clone(),
    };

    let state = Arc::new(AppState {
        db: pool.clone(),
        redis: redis_client,
        sm: manager,
        log_tx,
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
                    pid: None,
                },
            );
            continue;
        }
        state.sm.start_instance(&session.id, state.clone()).await;
    }

    if active_count > 0 || paused_count > 0 {
        logger::success(
            "READY",
            &format!("{} active, {} paused", active_count, paused_count),
        );
    }

    let static_service = ServeDir::new("ui/build");
    let app = routes::create_routes()
        .layer(CorsLayer::permissive())
        .with_state(state)
        .fallback_service(static_service);

    logger::banner(port);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
