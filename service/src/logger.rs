use colored::Colorize;
use std::sync::OnceLock;

static DEBUG_ENABLED: OnceLock<bool> = OnceLock::new();

/// Initialize the logger. Call this once at startup.
pub fn init() {
    let logs_enabled = std::env::var("LOGS")
        .map(|v| v.to_lowercase() == "true" || v == "1")
        .unwrap_or(false);
    
    DEBUG_ENABLED.set(logs_enabled).ok();
    
    if logs_enabled {
        debug("Logger", "Debug logging enabled");
    }
}

/// Check if debug logging is enabled
pub fn is_debug() -> bool {
    *DEBUG_ENABLED.get().unwrap_or(&false)
}

fn timestamp() -> String {
    chrono::Local::now().format("%H:%M:%S").to_string()
}

/// Log an info message (always shown)
pub fn info(tag: &str, message: &str) {
    println!(
        "  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).cyan().bold(),
        message
    );
}

/// Log a success message (always shown)
pub fn success(tag: &str, message: &str) {
    println!(
        "  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).green().bold(),
        message.green()
    );
}

/// Log a warning message (always shown)
pub fn warn(tag: &str, message: &str) {
    println!(
        "  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).yellow().bold(),
        message.yellow()
    );
}

/// Log an error message (always shown)
pub fn error(tag: &str, message: &str) {
    eprintln!(
        "  {} {} {}",
        timestamp().dimmed(),
        format!("[{}]", tag).red().bold(),
        message.red()
    );
}

/// Log a debug message (only when LOGS=true)
pub fn debug(tag: &str, message: &str) {
    if is_debug() {
        println!(
            "  {} {} {}",
            timestamp().dimmed(),
            format!("[{}]", tag).magenta(),
            message.dimmed()
        );
    }
}

/// Log a startup banner
pub fn banner(port: u16) {
    println!();
    println!(
        "  {}  {}",
        "WHATSALY".green().bold(),
        format!("v{}", env!("CARGO_PKG_VERSION")).dimmed()
    );
    println!();
    println!(
        "  {}  Local:   {}",
        "➜".green().bold(),
        format!("http://localhost:{}/", port).cyan()
    );
    println!(
        "  {}  Network: {}",
        "➜".dimmed(),
        format!("http://0.0.0.0:{}/", port).cyan()
    );
    println!();
}
