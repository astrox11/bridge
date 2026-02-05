use colored::Colorize;
use std::sync::OnceLock;
use tokio::sync::broadcast;

static DEBUG_ENABLED: OnceLock<bool> = OnceLock::new();
static LOG_TX: OnceLock<broadcast::Sender<String>> = OnceLock::new();

pub fn init() {
    let logs_enabled = std::env::var("LOGS")
        .map(|v| v.to_lowercase() == "true" || v == "1")
        .unwrap_or(false);

    DEBUG_ENABLED.set(logs_enabled).ok();

    if logs_enabled {
        debug("Logger", "Debug logging enabled");
    }
}

pub fn set_broadcast(tx: broadcast::Sender<String>) {
    LOG_TX.set(tx).ok();
}

fn broadcast(level: &str, tag: &str, message: &str) {
    if let Some(tx) = LOG_TX.get() {
        let log_line = format!("{}|{}|{}", level, tag, message);
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
