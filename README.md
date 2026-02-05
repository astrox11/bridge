<div align="center">
  <a href="https://golang.org/">
    <img src="./ui/logo.png" width="280" height="280" />
  </a>
</div>

# Description

Whatsaly is a comprehensive WhatsApp management platform designed to orchestrate and supervise multiple WhatsApp bot instances. It consists of a high-performance backend service and standalone worker nodes that interact directly with the WhatsApp Web protocol.

### Service

The service is a high-performance backend written in Rust that handles the orchestration and supervision of multiple WhatsApp bot instances. It provides a REST API for managing sessions, sending messages, and receiving events from the workers.

### Worker Nodes

The worker nodes are standalone instances that interact directly with the WhatsApp Web protocol. They are written in Rust and communicate with the core service via a Unix domain socket.

### Data & Communication

The system utilizes a hybrid state management approach, using Redis for temporary session data/caching and SQLite for persistent storage. Communication between the supervisor and workers is handled over a high-performance TCP layer using Protocol Buffers.

# Getting Started

Please ensure [Docker](https://www.docker.com/get-started) is already installed.

1. **Clone the repository:**

```bash
git clone https://github.com/astrox11/Whatsaly
cd Whatsaly
```

2. **Start the container:**

```bash
docker-compose up -d
```

3. **Check container logs:**

```bash
docker-compose logs -f whatsaly
```

# Contributing

Please read the [Guidelines](CONTRIBUTING.md) before submitting pull requests.
