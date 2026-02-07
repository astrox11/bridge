use colored::Colorize;
use std::sync::{OnceLock, RwLock};
use tokio::sync::broadcast;

static DEBUG_ENABLED: OnceLock<bool> = OnceLock::new();
static LOG_TX: OnceLock<broadcast::Sender<String>> = OnceLock::new();
// Keep a history of recent logs so new connections can see past logs
static LOG_HISTORY: OnceLock<RwLock<Vec<String>>> = OnceLock::new();
const MAX_HISTORY: usize = 100;

pub fn init() {
    let logs_enabled = std::env::var("LOGS")
        .map(|v| v.to_lowercase() == "true" || v == "1")
        .unwrap_or(false);

    DEBUG_ENABLED.set(logs_enabled).ok();
    LOG_HISTORY.set(RwLock::new(Vec::with_capacity(MAX_HISTORY))).ok();

    if logs_enabled {
        debug("Logger", "Debug logging enabled");
    }
}

pub fn set_broadcast(tx: broadcast::Sender<String>) {
    LOG_TX.set(tx).ok();
}

/// Get the recent log history for new stream connections
pub fn get_history() -> Vec<String> {
    LOG_HISTORY
        .get()
        .and_then(|h| h.read().ok())
        .map(|h| h.clone())
        .unwrap_or_default()
}

fn broadcast(level: &str, tag: &str, message: &str) {
    let log_line = format!("{}|{}|{}", level, tag, message);
    
    // Add to history buffer
    if let Some(history) = LOG_HISTORY.get() {
        if let Ok(mut h) = history.write() {
            h.push(log_line.clone());
            // Keep only the last MAX_HISTORY entries
            if h.len() > MAX_HISTORY {
                h.remove(0);
            }
        }
    }
    
    // Broadcast to live subscribers
    if let Some(tx) = LOG_TX.get() {
        let _ = tx.send(log_line);
    }
}

pub fn is_debug() -> bool {
    *DEBUG_ENABLED.get().unwrap_or(&false)
}

fn timestamp() -> String {
    chrono::Local::now().format("%H:%M:%S").to_string()
}

pub fn info(tag: &str, message: &str) {
    // Adding \r ensures we start at the far left
    println!(
        "\r  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).cyan().bold(),
        message
    );
    broadcast("INFO", tag, message);
}

pub fn success(tag: &str, message: &str) {
    println!(
        "\r  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).green().bold(),
        message.green()
    );
    broadcast("SUCCESS", tag, message);
}

pub fn warn(tag: &str, message: &str) {
    println!(
        "\r  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).yellow().bold(),
        message.yellow()
    );
    broadcast("WARN", tag, message);
}

pub fn error(tag: &str, message: &str) {
    eprintln!(
        "\r  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).red().bold(),
        message.red()
    );
    broadcast("ERROR", tag, message);
}

pub fn debug(tag: &str, message: &str) {
    if is_debug() {
        println!(
            "\r  {} {} {}",
            timestamp().dimmed(),
            format!("[{}]", tag).magenta(),
            message.dimmed()
        );
        broadcast("DEBUG", tag, message);
    }
}

pub fn banner(port: u16) {
    println!("\r");
    println!(
        "\r  {}  {}",
        "WHATSALY".green().bold(),
        format!("v{}", env!("CARGO_PKG_VERSION")).dimmed()
    );
    println!("\r");
    println!(
        "\r  {}  Local:    {}",
        "➜".green().bold(),
        format!("http://localhost:{}/", port).cyan()
    );
    println!(
        "\r  {}  Network: {}",
        "➜".dimmed(),
        format!("http://0.0.0.0:{}/", port).cyan()
    );
    println!("\r");
}
