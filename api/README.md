# Whatsaly orchestration service

<p>It functions as a supervisor and control plane for the WhatsApp client instances.</p>

## Core Functions

- **Worker Supervision:** Manages the lifecycle of child processes (running via Bun) that handle individual WhatsApp sessions.

- **Session Management:** Facilitates account pairing, session persistence, and instance recovery.

- **Data Aggregation:** Provides a centralized SQLite database (via GORM) for storing contacts, groups, and bot configurations across all instances.

- **Real-time Monitoring:** Exposes Server-Sent Events (SSE) for live system metrics and instance status updates to the frontend.

- **REST API Gateway:** Provides the interface for the web dashboard to configure bot settings and control WhatsApp instances programmatically.

