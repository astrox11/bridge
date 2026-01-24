package database

import (
	"gorm.io/gorm"
	"time"
)

type Session struct {
	ID                string    `gorm:"primaryKey;column:id"`
	Status            string    `gorm:"not null;column:status;index:idx_sessions_status"`
	Name              string    `gorm:"column:name"`
	ProfileURL        string    `gorm:"column:profileUrl"`
	IsBusinessAccount bool      `gorm:"column:isBusinessAccount;not null;default:false"`
	CreatedAt         time.Time `gorm:"column:createdAt;not null;default:CURRENT_TIMESTAMP"`
}

func (Session) TableName() string {
	return "sessions"
}

func GetAllSessions(db *gorm.DB) ([]Session, error) {
	var sessions []Session
	err := db.Order("createdAt DESC").Find(&sessions).Error
	return sessions, err
}

func GetSessionByID(db *gorm.DB, id string) (*Session, error) {
	var session Session
	err := db.First(&session, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}
