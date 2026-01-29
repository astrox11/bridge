# Whatsaly Core

<p>It serves as a standalone TypeScript application powered by the [Bun](https://bun.sh/) runtime, leveraging the [Baileys](https://github.com/WhiskeySockets/Baileys) library to interface with WhatsApp Web's protocols.</p>

## Core Responsibilities

- **Session Lifecycle:** Handles authentication such as, pairing code requests for linking new devices.

- **Protocol Handling:** Manages the persistent WebSocket connection to WhatsApp and processes incoming events like new messages, group updates, and connection status changes.

- **State Persistence:** Implements a hybrid authentication state using Redis for credential caching and SQLite for long-term storage of messages, contacts, and group metadata.

- **Message Processing:** Orchestrates message serialization, command handling, and plugin execution for automated responses.

- **Inter-Process Communication:** Emits specialized logs (prefixed with `[GO_DATA]`) to communicate status updates back to the Go-based supervisor.

## Key Components

`client.ts`: The main entry point. It initializes the WhatsApp socket, sets up event listeners, and manages the reconnection logic.

`seralize.ts`: Transforms raw WhatsApp message objects into a more accessible and unified format for use by plugins and handlers.

`/plugins`: A modular directory for extending bot functionality (e.g., automated commands like ping or uptime).

`/sql`: Contains the database abstraction layer for persisting session-specific data.

## Usage

**Installation**

```bash
bun install
```

**Execution**

```bash
bun start <phone_number>
```
