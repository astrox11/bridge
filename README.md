# AstroBridge

AstroBridge is a high-performance middleware layer for programmatically controlling WhatsApp. It handles message intake, command parsing, outbound actions, and session management—allowing you to interact with WhatsApp seamlessly by sending Messages.

Powered by [Whatsmeow](https://github.com/tulir/whatsmeow), an open-source reverse-engineered WhatsApp client, AstroBridge abstracts away low-level protocol details while giving you full flexibility to send, receive, process, and automate WhatsApp operations with reliability and speed.

# Setup

AstroBridge is currently under active development, expect bugs.
You can get started by cloning the repository:

```
git clone https://github.com/astrox11/AstroBridge
cd AstroBridge
```

Make sure you have the **latest version of Go**.

## **Windows (PowerShell)**

Install Go and run the project:

```powershell
winget install Go.Go && go version
cd AstroBridge && go run .
```

---

## **Linux**

### **Ubuntu / Debian**

```bash
sudo apt update && sudo apt install -y golang && go version
cd AstroBridge && go run .
```

### **Fedora**

```bash
sudo dnf install -y golang && go version
cd AstroBridge && go run .
```

---

## **macOS (Homebrew)**

```bash
brew install go && go version
cd AstroBridge && go run .
```

# Contributing

Contributions are welcome! AstroBridge is evolving, and community input helps shape its direction.

If you’d like to contribute:

1. **Fork** the repository
2. **Create a new branch** for your feature or fix

   ```
   git checkout -b feature-name
   ```
3. **Commit** your changes with clear messages
4. **Push** to your fork
5. Open a **Pull Request** describing what you improved or added

Before submitting, please:

* Ensure code is formatted (`go fmt ./...`)
* Run basic tests or manual checks
* Keep changes focused and well-documented