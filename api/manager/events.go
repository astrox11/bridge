package manager

import (
	"api/pb"
	"fmt"
)

// handleProtobufEvent processes typed events received from the Bun worker via Unix Socket.
func (sm *SessionManager) handleProtobufEvent(w *Worker, event *pb.WorkerEvent) {
	w.mu.Lock()
	defer w.mu.Unlock()

	switch x := event.Event.(type) {
	case *pb.WorkerEvent_Connection:
		data := x.Connection

		// Map Bun/Baileys statuses to Go Worker statuses
		switch data.Status {
		case "connected":
			w.Status = "active"
			w.PairingCode = ""
		case "logged_out":
			w.Status = "logged_out"
		case "pairing":
			// Safely handle the optional pointer field
			if data.PairingCode != nil {
				w.PairingCode = *data.PairingCode
			}
		default:
			w.Status = data.Status
		}

	case *pb.WorkerEvent_RawLog:
		// Replaces the old fmt.Printf("[%s] %s\n", w.Phone, line) logic
		fmt.Printf("[%s] LOG: %s\n", w.Phone, x.RawLog)
	}

	// Persist the updated worker state to the database
	sm.SaveState(w)
}
