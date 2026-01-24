package manager

import (
	"api/sql"
	"fmt"
	"os/exec"
	"sync"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

type SessionManager struct {
	Workers map[string]*Worker
	mu      sync.Mutex
}

func CreateSession() *SessionManager {
	return &SessionManager{
		Workers: make(map[string]*Worker),
	}
}

func (sm *SessionManager) GetWorker(phone string) (*Worker, bool) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	w, ok := sm.Workers[phone]
	return w, ok
}

func (sm *SessionManager) StartInstance(phone string, status string) error {
	sm.mu.Lock()

	w, exists := sm.Workers[phone]
	if exists && w.IsRunning {
		sm.mu.Unlock()
		return fmt.Errorf("instance for %s is already running", phone)
	}

	if !exists {
		w = &Worker{
			Phone:  phone,
			Status: status,
		}
		sm.Workers[phone] = w
	}
	sm.mu.Unlock()

	go sm.supervisor(w)

	return nil
}

func (sm *SessionManager) PauseInstance(phone string, pause bool) error {
	sm.mu.Lock()
	w, ok := sm.Workers[phone]
	sm.mu.Unlock()

	if !ok {
		return fmt.Errorf("instance not found")
	}

	w.mu.Lock()
	if pause {
		w.Status = "paused"
		if w.Process != nil && w.Process.Process != nil {
			w.Process.Process.Kill()
		}
	} else {
		w.Status = "starting"
	}
	w.mu.Unlock()

	sm.SaveState(w)
	return nil
}

func (sm *SessionManager) SaveState(w *Worker) {
	w.mu.RLock()
	defer w.mu.RUnlock()

	err := database.DB.Where(database.Session{ID: w.Phone}).
		Assign(database.Session{
			Status: w.Status,
		}).
		FirstOrCreate(&database.Session{}).Error

	if err != nil {
		fmt.Printf("Error saving state to DB: %v\n", err)
	}
}

func (sm *SessionManager) ResetSession(phone string) error {
	sm.mu.Lock()
	w, ok := sm.Workers[phone]
	sm.mu.Unlock()

	if ok && w.Process != nil && w.Process.Process != nil {
		w.Process.Process.Kill()
	}

	cmd := exec.Command("redis-cli", "DEL", fmt.Sprintf("sessions:%s", phone))
	return cmd.Run()
}

func (sm *SessionManager) ClearSession(phone string) error {
	sm.mu.Lock()
	w, ok := sm.Workers[phone]
	if ok {
		if w.Process != nil && w.Process.Process != nil {
			w.Process.Process.Kill()
		}
		delete(sm.Workers, phone)
	}
	sm.mu.Unlock()

	db := database.DB

	if err := db.Where("id = ?", phone).Delete(&database.Session{}).Error; err != nil {
		fmt.Printf("Error deleting from sessions: %v\n", err)
	}

	if err := db.Where("sessionId = ?", phone).Delete(&database.UserSettings{}).Error; err != nil {
		fmt.Printf("Error deleting from session_configurations: %v\n", err)
	}

	if err := db.Exec("DELETE FROM session_contacts WHERE sessionId = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from session_contacts: %v\n", err)
	}

	if err := db.Exec("DELETE FROM session_messages WHERE sessionId = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from session_messages: %v\n", err)
	}

	if err := db.Exec("DELETE FROM session_groups WHERE sessionId = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from session_groups: %v\n", err)
	}

	if err := db.Exec("DELETE FROM auth_tokens WHERE sessionId = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from auth_tokens: %v\n", err)
	}

	if err := db.Exec("DELETE FROM devices WHERE sessionId = ?", phone).Error; err != nil {
		fmt.Printf("Error deleting from devices: %v\n", err)
	}

	pattern := fmt.Sprintf("session:%s:*", phone)
	cmd := exec.Command("bash", "-c", fmt.Sprintf("redis-cli --scan --pattern '%s' | xargs -r redis-cli DEL", pattern))
	if err := cmd.Run(); err != nil {
		fmt.Printf("Error flushing Redis data: %v\n", err)
		return err
	}
	return nil
}

func (sm *SessionManager) SyncSessionState() {
	var sessions []database.Session
	database.DB.Where("status != ?", "logged_out").Find(&sessions)

	for _, s := range sessions {
		if s.Status != "paused" {
			sm.StartInstance(s.ID, "starting")
		} else {
			sm.mu.Lock()
			sm.Workers[s.ID] = &Worker{
				Phone:  s.ID,
				Status: "paused",
			}
			sm.mu.Unlock()
		}
	}
}

type SystemStats struct {
	CPU    float64 `json:"cpu"`
	Memory float64 `json:"memory"`
	Disk   float64 `json:"disk"`
}

func GetSystemStats() SystemStats {
	c, _ := cpu.Percent(0, false)
	m, _ := mem.VirtualMemory()
	d, _ := disk.Usage("/")

	var cpuVal float64
	if len(c) > 0 {
		cpuVal = c[0]
	}

	return SystemStats{
		CPU:    cpuVal,
		Memory: m.UsedPercent,
		Disk:   d.UsedPercent,
	}
}
