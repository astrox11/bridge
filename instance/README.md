# Whatsaly Instance

It serves as a standalone TypeScript application powered by the [Bun](https://bun.sh/) runtime, using the [Baileys](https://github.com/WhiskeySockets/Baileys) library to interact with WhatsApp Web.

## Responsibilities

- **Session:** Handles authentication such as linking new devices.

- **Protocol Handling:** Manages the persistent WebSocket connection to WhatsApp and processes incoming events.

- **State Persistence:** Implements a hybrid authentication state using Redis for credential caching and SQLite/Postrge for static data.

- **Message Processing:** Orchestrates message serialization, command handling, and plugin execution for automated responses.

## Usage

**Installation**

```bash
bun install
bun run db:push
```

**Execution**

```bash
bun start <phone_number>
```
