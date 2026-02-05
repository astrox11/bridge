use crate::AppState;
use axum::{
    Json,
    extract::{Path, State},
};
use serde::Serialize;
use std::sync::Arc;
use sysinfo::{Pid, System};

#[derive(Serialize)]
pub struct InstanceStats {
    pub phone: String,
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub memory_percent: f32,
    pub status: String,
    pub pid: Option<u32>,
}

pub async fn get_instance_stats(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    let workers = state.sm.workers.read().await;
    
    if let Some(worker) = workers.get(&phone) {
        if let Some(pid) = worker.pid {
            let mut sys = System::new();
            let pid_obj = Pid::from_u32(pid);
            sys.refresh_memory();
            sys.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[pid_obj]), true);
            
            if let Some(process) = sys.process(pid_obj) {
                let total_memory = sys.total_memory();
                let memory_usage = process.memory();
                let cpu_usage = process.cpu_usage();
                let memory_percent = if total_memory > 0 {
                    (memory_usage as f32 / total_memory as f32) * 100.0
                } else {
                    0.0
                };

                let stats = InstanceStats {
                    phone: worker.phone.clone(),
                    cpu_usage,
                    memory_usage,
                    memory_percent,
                    status: worker.status.clone(),
                    pid: worker.pid,
                };
                
                return Json(serde_json::json!(stats));
            }
        }
        
        // Worker exists but no PID or process not found
        return Json(serde_json::json!({
            "phone": worker.phone,
            "cpu_usage": 0.0,
            "memory_usage": 0,
            "memory_percent": 0.0,
            "status": worker.status,
            "pid": worker.pid,
            "error": "Process not running or not found"
        }));
    }
    
    Json(serde_json::json!({"error": "Instance not found"}))
}
