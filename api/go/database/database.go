package database

import (
	"database/sql"
	"embed"
	"fmt"
	"log"
	"regexp"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed sql/schema.sql
var schemaFS embed.FS

type Database struct {
	db            *sql.DB
	mu            sync.RWMutex
	createdTables map[string]bool
	tablesMu      sync.RWMutex
}

var instance *Database
var once sync.Once

func GetDatabase() *Database {
	once.Do(func() {
		db, err := sql.Open("sqlite", "database.db?_journal=WAL&_busy_timeout=5000")
		if err != nil {
			log.Fatalf("Failed to open database: %v", err)
		}

		db.SetMaxOpenConns(1)
		db.SetMaxIdleConns(1)
		db.SetConnMaxLifetime(time.Hour)

		instance = &Database{
			db:            db,
			createdTables: make(map[string]bool),
		}
		if err := instance.initSchema(); err != nil {
			log.Fatalf("Failed to initialize schema: %v", err)
		}
	})
	return instance
}

func (d *Database) initSchema() error {
	schema, err := schemaFS.ReadFile("sql/schema.sql")
	if err != nil {
		return err
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err = d.db.Exec(string(schema))
	return err
}

var phoneRegex = regexp.MustCompile(`[^0-9]`)

func sanitizePhoneNumber(phone string) string {
	return phoneRegex.ReplaceAllString(phone, "")
}

func (d *Database) GetUserTableName(phone, suffix string) string {
	return fmt.Sprintf("user_%s_%s", sanitizePhoneNumber(phone), suffix)
}

func (d *Database) ensureTable(tableName, createSQL string) {
	d.tablesMu.Lock()
	defer d.tablesMu.Unlock()

	if d.createdTables[tableName] {
		return
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(createSQL)
	if err != nil {
		log.Printf("Error creating table %s: %v", tableName, err)
		return
	}
	d.createdTables[tableName] = true
}

func (d *Database) CreateUserAuthTable(phone string) string {
	tableName := d.GetUserTableName(phone, "auth")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (name TEXT PRIMARY KEY, data TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserMessagesTable(phone string) string {
	tableName := d.GetUserTableName(phone, "messages")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id TEXT PRIMARY KEY, msg TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserContactsTable(phone string) string {
	tableName := d.GetUserTableName(phone, "contacts")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (pn TEXT PRIMARY KEY, lid TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserGroupsTable(phone string) string {
	tableName := d.GetUserTableName(phone, "groups")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id TEXT PRIMARY KEY, data TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserSudoTable(phone string) string {
	tableName := d.GetUserTableName(phone, "sudo")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (pn TEXT PRIMARY KEY, lid TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserBanTable(phone string) string {
	tableName := d.GetUserTableName(phone, "ban")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (pn TEXT PRIMARY KEY, lid TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserModeTable(phone string) string {
	tableName := d.GetUserTableName(phone, "mode")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id INTEGER PRIMARY KEY CHECK (id = 1), mode TEXT NOT NULL)`, tableName))
	return tableName
}

func (d *Database) CreateUserPrefixTable(phone string) string {
	tableName := d.GetUserTableName(phone, "prefix")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id INTEGER PRIMARY KEY CHECK (id = 1), prefix TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserAntideleteTable(phone string) string {
	tableName := d.GetUserTableName(phone, "antidelete")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id INTEGER PRIMARY KEY CHECK (id = 1), active INTEGER NOT NULL, mode TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserAliveTable(phone string) string {
	tableName := d.GetUserTableName(phone, "alive")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id INTEGER PRIMARY KEY CHECK (id = 1), alive_message TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserMentionTable(phone string) string {
	tableName := d.GetUserTableName(phone, "mention")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (groupId TEXT PRIMARY KEY, message TEXT, type TEXT DEFAULT 'text', data TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserFilterTable(phone string) string {
	tableName := d.GetUserTableName(phone, "filter")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (trigger TEXT PRIMARY KEY, reply TEXT, status INTEGER)`, tableName))
	return tableName
}

func (d *Database) CreateUserAfkTable(phone string) string {
	tableName := d.GetUserTableName(phone, "afk")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id INTEGER PRIMARY KEY CHECK (id = 1), status INTEGER, message TEXT, time BIGINT)`, tableName))
	return tableName
}

func (d *Database) CreateUserGroupEventTable(phone string) string {
	tableName := d.GetUserTableName(phone, "group_event")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (id INTEGER PRIMARY KEY CHECK (id = 1), status INTEGER)`, tableName))
	return tableName
}

func (d *Database) CreateUserStickerTable(phone string) string {
	tableName := d.GetUserTableName(phone, "sticker")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (name TEXT PRIMARY KEY, sha256 TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserBgmTable(phone string) string {
	tableName := d.GetUserTableName(phone, "bgm")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (trigger TEXT PRIMARY KEY, audioData TEXT)`, tableName))
	return tableName
}

func (d *Database) CreateUserActivitySettingsTable(phone string) string {
	tableName := d.GetUserTableName(phone, "activity_settings")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		auto_read_messages INTEGER NOT NULL DEFAULT 0,
		auto_recover_deleted_messages INTEGER NOT NULL DEFAULT 0,
		auto_antispam INTEGER NOT NULL DEFAULT 0,
		auto_typing INTEGER NOT NULL DEFAULT 0,
		auto_recording INTEGER NOT NULL DEFAULT 0,
		auto_reject_calls INTEGER NOT NULL DEFAULT 0,
		auto_always_online INTEGER NOT NULL DEFAULT 0
	)`, tableName))
	return tableName
}

func (d *Database) CreateUserAntilinkTable(phone string) string {
	tableName := d.GetUserTableName(phone, "antilink")
	d.ensureTable(tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (groupId TEXT PRIMARY KEY, mode INTEGER NOT NULL DEFAULT 0)`, tableName))
	return tableName
}

func (d *Database) InitializeUserTables(phone string) {
	d.CreateUserAuthTable(phone)
	d.CreateUserMessagesTable(phone)
	d.CreateUserContactsTable(phone)
	d.CreateUserGroupsTable(phone)
	d.CreateUserSudoTable(phone)
	d.CreateUserBanTable(phone)
	d.CreateUserModeTable(phone)
	d.CreateUserPrefixTable(phone)
	d.CreateUserAntideleteTable(phone)
	d.CreateUserAliveTable(phone)
	d.CreateUserMentionTable(phone)
	d.CreateUserFilterTable(phone)
	d.CreateUserAfkTable(phone)
	d.CreateUserGroupEventTable(phone)
	d.CreateUserStickerTable(phone)
	d.CreateUserBgmTable(phone)
	d.CreateUserActivitySettingsTable(phone)
	d.CreateUserAntilinkTable(phone)
	log.Printf("Initialized tables for user %s", phone)
}

func (d *Database) DeleteUserTables(phone string) {
	sanitizedPhone := sanitizePhoneNumber(phone)
	suffixes := []string{"auth", "messages", "contacts", "groups", "sudo", "ban", "mode", "prefix", "antidelete", "alive", "mention", "filter", "afk", "group_event", "sticker", "bgm", "activity_settings", "antilink"}

	d.mu.Lock()
	defer d.mu.Unlock()

	d.tablesMu.Lock()
	defer d.tablesMu.Unlock()

	for _, suffix := range suffixes {
		tableName := fmt.Sprintf("user_%s_%s", sanitizedPhone, suffix)
		_, err := d.db.Exec(fmt.Sprintf(`DROP TABLE IF EXISTS "%s"`, tableName))
		if err != nil {
			log.Printf("Error dropping table %s: %v", tableName, err)
		}
		delete(d.createdTables, tableName)
	}
	log.Printf("Deleted tables for user %s", phone)
}

func getPhoneFromSessionID(sessionID string) string {
	if len(sessionID) > 8 && sessionID[:8] == "session_" {
		return sessionID[8:]
	}
	return sessionID
}

func (d *Database) Close() error {
	return d.db.Close()
}

type Session struct {
	ID          string      `json:"id"`
	PhoneNumber string      `json:"phone_number"`
	Status      int         `json:"status"`
	UserInfo    *string     `json:"user_info,omitempty"`
	CreatedAt   int64       `json:"created_at"`
}

type ActivitySettings struct {
	SessionID                    string `json:"session_id"`
	AutoReadMessages             bool   `json:"auto_read_messages"`
	AutoRecoverDeletedMessages   bool   `json:"auto_recover_deleted_messages"`
	AutoAntispam                 bool   `json:"auto_antispam"`
	AutoTyping                   bool   `json:"auto_typing"`
	AutoRecording                bool   `json:"auto_recording"`
	AutoRejectCalls              bool   `json:"auto_reject_calls"`
	AutoAlwaysOnline             bool   `json:"auto_always_online"`
}

func (d *Database) CreateSession(id, phoneNumber string, status int) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		"INSERT OR REPLACE INTO sessions (id, phone_number, status, created_at) VALUES (?, ?, ?, ?)",
		id, phoneNumber, status, time.Now().UnixMilli(),
	)
	if err != nil {
		return err
	}

	d.mu.Unlock()
	d.InitializeUserTables(phoneNumber)
	d.mu.Lock()

	return nil
}

func (d *Database) GetSession(idOrPhone string) (*Session, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	row := d.db.QueryRow(
		"SELECT id, phone_number, status, user_info, created_at FROM sessions WHERE id = ? OR phone_number = ?",
		idOrPhone, idOrPhone,
	)

	var s Session
	err := row.Scan(&s.ID, &s.PhoneNumber, &s.Status, &s.UserInfo, &s.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (d *Database) GetAllSessions() ([]Session, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query("SELECT id, phone_number, status, user_info, created_at FROM sessions")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.PhoneNumber, &s.Status, &s.UserInfo, &s.CreatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, rows.Err()
}

func (d *Database) UpdateSessionStatus(id string, status int) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec("UPDATE sessions SET status = ? WHERE id = ?", status, id)
	return err
}

func (d *Database) UpdateSessionUserInfo(id string, userInfo string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec("UPDATE sessions SET user_info = ? WHERE id = ?", userInfo, id)
	return err
}

func (d *Database) DeleteSession(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec("DELETE FROM sessions WHERE id = ?", id)
	return err
}

func (d *Database) GetActivitySettings(sessionID string) (*ActivitySettings, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserActivitySettingsTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	row := d.db.QueryRow(
		fmt.Sprintf(`SELECT auto_read_messages, auto_recover_deleted_messages, auto_antispam, 
		        auto_typing, auto_recording, auto_reject_calls, auto_always_online 
		 FROM "%s" WHERE id = 1`, tableName),
	)

	var s ActivitySettings
	s.SessionID = sessionID
	err := row.Scan(
		&s.AutoReadMessages, &s.AutoRecoverDeletedMessages,
		&s.AutoAntispam, &s.AutoTyping, &s.AutoRecording,
		&s.AutoRejectCalls, &s.AutoAlwaysOnline,
	)
	if err == sql.ErrNoRows {
		return &ActivitySettings{SessionID: sessionID}, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (d *Database) UpdateActivitySettings(sessionID string, settings map[string]bool) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserActivitySettingsTable(phone)

	currentSettings, err := d.GetActivitySettings(sessionID)
	if err != nil {
		return err
	}

	for key, value := range settings {
		switch key {
		case "auto_read_messages":
			currentSettings.AutoReadMessages = value
		case "auto_recover_deleted_messages":
			currentSettings.AutoRecoverDeletedMessages = value
		case "auto_antispam":
			currentSettings.AutoAntispam = value
		case "auto_typing":
			currentSettings.AutoTyping = value
		case "auto_recording":
			currentSettings.AutoRecording = value
		case "auto_reject_calls":
			currentSettings.AutoRejectCalls = value
		case "auto_always_online":
			currentSettings.AutoAlwaysOnline = value
		}
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err = d.db.Exec(
		fmt.Sprintf(`INSERT OR REPLACE INTO "%s" 
		 (id, auto_read_messages, auto_recover_deleted_messages, auto_antispam, 
		  auto_typing, auto_recording, auto_reject_calls, auto_always_online) 
		 VALUES (1, ?, ?, ?, ?, ?, ?, ?)`, tableName),
		currentSettings.AutoReadMessages, currentSettings.AutoRecoverDeletedMessages,
		currentSettings.AutoAntispam, currentSettings.AutoTyping, currentSettings.AutoRecording,
		currentSettings.AutoRejectCalls, currentSettings.AutoAlwaysOnline,
	)
	return err
}

func (d *Database) SaveAuthData(sessionID, name, data string) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAuthTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		fmt.Sprintf(`INSERT OR REPLACE INTO "%s" (name, data) VALUES (?, ?)`, tableName),
		name, data,
	)
	return err
}

func (d *Database) GetAuthData(sessionID, name string) (string, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAuthTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	var data string
	err := d.db.QueryRow(
		fmt.Sprintf(`SELECT data FROM "%s" WHERE name = ?`, tableName),
		name,
	).Scan(&data)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return data, err
}

func (d *Database) GetAllAuthData(sessionID string) (map[string]string, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAuthTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(fmt.Sprintf(`SELECT name, data FROM "%s"`, tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]string)
	for rows.Next() {
		var name, data string
		if err := rows.Scan(&name, &data); err != nil {
			return nil, err
		}
		result[name] = data
	}
	return result, rows.Err()
}

func (d *Database) DeleteAuthData(sessionID string) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAuthTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(fmt.Sprintf(`DELETE FROM "%s"`, tableName))
	return err
}

func (d *Database) AddContact(sessionID, phoneNumber, lid string) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserContactsTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		fmt.Sprintf(`INSERT OR REPLACE INTO "%s" (pn, lid) VALUES (?, ?)`, tableName),
		phoneNumber, lid,
	)
	return err
}

func (d *Database) GetContact(sessionID, phoneNumber string) (string, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserContactsTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	var lid string
	err := d.db.QueryRow(
		fmt.Sprintf(`SELECT lid FROM "%s" WHERE pn = ?`, tableName),
		phoneNumber,
	).Scan(&lid)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return lid, err
}

func (d *Database) SaveGroupsCache(sessionID string, groups string) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserGroupsTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		fmt.Sprintf(`INSERT OR REPLACE INTO "%s" (id, data) VALUES (?, ?)`, tableName),
		"_all_groups_cache", groups,
	)
	return err
}

func (d *Database) GetGroupsCache(sessionID string) (string, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserGroupsTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	var data string
	err := d.db.QueryRow(
		fmt.Sprintf(`SELECT data FROM "%s" WHERE id = ?`, tableName),
		"_all_groups_cache",
	).Scan(&data)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return data, err
}

func (d *Database) Exec(query string, args ...interface{}) (sql.Result, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.db.Exec(query, args...)
}

func (d *Database) Query(query string, args ...interface{}) (*sql.Rows, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.db.Query(query, args...)
}

func (d *Database) QueryRow(query string, args ...interface{}) *sql.Row {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.db.QueryRow(query, args...)
}

func (d *Database) GetAliveMessage(sessionID string) (string, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAliveTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	var message sql.NullString
	err := d.db.QueryRow(
		fmt.Sprintf(`SELECT alive_message FROM "%s" WHERE id = 1`, tableName),
	).Scan(&message)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return message.String, nil
}

func (d *Database) SetAliveMessage(sessionID, message string) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAliveTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		fmt.Sprintf(`INSERT OR REPLACE INTO "%s" (id, alive_message) VALUES (1, ?)`, tableName),
		message,
	)
	return err
}

type AfkSettings struct {
	Status  int    `json:"status"`
	Message string `json:"message,omitempty"`
	Time    int64  `json:"time,omitempty"`
}

func (d *Database) GetAfk(sessionID string) (*AfkSettings, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAfkTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	var status int
	var message sql.NullString
	var timestamp sql.NullInt64
	err := d.db.QueryRow(
		fmt.Sprintf(`SELECT status, message, time FROM "%s" WHERE id = 1`, tableName),
	).Scan(&status, &message, &timestamp)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &AfkSettings{
		Status:  status,
		Message: message.String,
		Time:    timestamp.Int64,
	}, nil
}

func (d *Database) SetAfk(sessionID string, status int, message string, timestamp int64) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserAfkTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		fmt.Sprintf(`INSERT OR REPLACE INTO "%s" (id, status, message, time) VALUES (1, ?, ?, ?)`, tableName),
		status, message, timestamp,
	)
	return err
}

type MentionData struct {
	Type    string `json:"type"`
	Message string `json:"message,omitempty"`
	Data    string `json:"data,omitempty"`
}

func (d *Database) GetMention(sessionID, groupID string) (*MentionData, error) {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserMentionTable(phone)

	d.mu.RLock()
	defer d.mu.RUnlock()

	var mentionType sql.NullString
	var message sql.NullString
	var data sql.NullString
	err := d.db.QueryRow(
		fmt.Sprintf(`SELECT type, message, data FROM "%s" WHERE groupId = ?`, tableName),
		groupID,
	).Scan(&mentionType, &message, &data)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &MentionData{
		Type:    mentionType.String,
		Message: message.String,
		Data:    data.String,
	}, nil
}

func (d *Database) SetMention(sessionID, groupID, mentionType, message, data string) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserMentionTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		fmt.Sprintf(`INSERT OR REPLACE INTO "%s" (groupId, type, message, data) VALUES (?, ?, ?, ?)`, tableName),
		groupID, mentionType, message, data,
	)
	return err
}

func (d *Database) DeleteMention(sessionID, groupID string) error {
	phone := getPhoneFromSessionID(sessionID)
	tableName := d.CreateUserMentionTable(phone)

	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(
		fmt.Sprintf(`DELETE FROM "%s" WHERE groupId = ?`, tableName),
		groupID,
	)
	return err
}
