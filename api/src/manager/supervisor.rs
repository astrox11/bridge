use crate::AppState;
use crate::manager::events::WorkerEvent;
use crate::manager::events::worker_event::Event;
use prost::Message;
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tokio::net::TcpListener;
use tokio::time::{Duration, sleep};

pub async fn run(phone: String, state: Arc<AppState>) {
    let mut rx = state.sm.tx.subscribe();
    let mut is_paused = false;

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind TCP");
    let port = listener.local_addr().unwrap().port();

    loop {
        if is_paused {
            while let Ok(msg) = rx.recv().await {
                if msg == format!("{}:resume", phone) {
                    is_paused = false;
                    break;
                }
            }
        }

        let mut child = tokio::process::Command::new("bun")
            .args(["run", "client.ts", &phone, &port.to_string()])
            .current_dir("../src")
            .spawn()
            .expect("Failed to spawn bun");

        loop {
            tokio::select! {
                accept_res = listener.accept() => {
                    if let Ok((mut stream, _)) = accept_res {
                        let st = state.clone();
                        tokio::spawn(async move {
                            if let Err(e) = process_socket(&mut stream, st).await {
                                eprintln!("Socket error: {}", e);
                            }
                        });
                    }
                }

                Ok(msg) = rx.recv() => {
                    let parts: Vec<&str> = msg.splitn(2, ':').collect();
                    if parts.get(0) == Some(&phone.as_str()) {
                        match parts.get(1) {
                            Some(&"pause") => {
                                is_paused = true;
                                let _ = child.kill().await;
                                let _ = child.wait().await; // Reap process
                                break;
                            }
                            Some(&"stop") => {
                                let _ = child.kill().await;
                                let _ = child.wait().await;
                                return;
                            }
                            _ => {}
                        }
                    }
                }

                exit_status = child.wait() => {
                    if !is_paused {
                        let status_code = exit_status.map(|s| s.to_string()).unwrap_or_default();
                        eprintln!("Worker {} exited ({}). Restarting...", phone, status_code);
                        update_db_status(&phone, "crashed", &state).await;
                        sleep(Duration::from_secs(5)).await;
                    }
                    break;
                }
            }
        }
    }
}

async fn process_socket(
    stream: &mut tokio::net::TcpStream,
    state: Arc<AppState>,
) -> anyhow::Result<()> {
    let mut header = [0u8; 4];
    while stream.read_exact(&mut header).await.is_ok() {
        let len = u32::from_be_bytes(header) as usize;
        let mut buf = vec![0u8; len];
        stream.read_exact(&mut buf).await?;

        if let Ok(event) = WorkerEvent::decode(&buf[..]) {
            handle_event(event, state.clone()).await;
        }
    }
    Ok(())
}

async fn update_db_status(phone: &str, status: &str, state: &Arc<AppState>) {
    let mut workers = state.sm.workers.write().await;
    if let Some(w) = workers.get_mut(phone) {
        w.status = status.to_string();
    }
    let _ = sqlx::query("UPDATE sessions SET status = ? WHERE id = ?")
        .bind(status)
        .bind(phone)
        .execute(&state.db)
        .await;
}
async fn handle_event(event: WorkerEvent, state: Arc<AppState>) {
    let mut workers = state.sm.workers.write().await;

    if let Some(inner_event) = event.event {
        match inner_event {
            Event::Connection(conn) => {
                if let Some(w) = workers.get_mut(&conn.phone) {
                    w.status = conn.status;
                    if !conn.pairing_code.is_empty() {
                        w.pairing_code = Some(conn.pairing_code);
                    } else if !conn.qr.is_empty() {
                        w.pairing_code = Some(conn.qr);
                    }
                }
            }
            Event::RawLog(log) => {
                println!("Bun Log: {}", log);
            }
        }
    }
}
