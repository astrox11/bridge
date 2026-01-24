package manager

import (
	"api/pb"
	"encoding/binary"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"google.golang.org/protobuf/proto"
)

type Worker struct {
	Phone       string
	Process     *exec.Cmd
	PairingCode string
	IsRunning   bool
	Status      string
	mu          sync.RWMutex
}

func (w *Worker) GetData() map[string]any {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return map[string]any{
		"phone":        w.Phone,
		"status":       w.Status,
		"pairing_code": w.PairingCode,
		"is_running":   w.IsRunning,
	}
}

func (w *Worker) GetStatus() string {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.Status
}

func (sm *SessionManager) supervisor(w *Worker) {
	socketPath := filepath.Join(os.TempDir(), "whatsaly_"+w.Phone+".sock")

	for {
		w.mu.RLock()
		status := w.Status
		w.mu.RUnlock()

		if status == "logged_out" {
			sm.ClearSession(w.Phone)
			break
		}

		os.Remove(socketPath)
		listener, err := net.Listen("unix", socketPath)
		if err != nil {
			time.Sleep(5 * time.Second)
			continue
		}

		// Pass socketPath as the 3rd CLI argument
		cmd := exec.Command("bun", "start", w.Phone, socketPath)
		cmd.Dir = "../src"
		w.Process = cmd

		if err := cmd.Start(); err != nil {
			listener.Close()
			time.Sleep(5 * time.Second)
			continue
		}

		w.mu.Lock()
		w.IsRunning = true
		w.mu.Unlock()

		// Goroutine to handle binary socket data
		go func() {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			defer conn.Close()

			for {
				var length uint32
				// 1. Read the 4-byte length prefix
				if err := binary.Read(conn, binary.BigEndian, &length); err != nil {
					return
				}

				// 2. Read the actual binary message
				buf := make([]byte, length)
				if _, err := io.ReadFull(conn, buf); err != nil {
					return
				}

				// 3. Unmarshal and handle event
				var event pb.WorkerEvent
				if err := proto.Unmarshal(buf, &event); err == nil {
					sm.handleProtobufEvent(w, &event)
				}
			}
		}()

		cmd.Wait()
		listener.Close()

		w.mu.Lock()
		w.IsRunning = false
		w.mu.Unlock()

		time.Sleep(2 * time.Second)
	}
}
