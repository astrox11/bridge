package database

import (
	"time"
)

type UserContact struct {
	SessionID  string    `gorm:"column:sessionId;primaryKey"`
	ContactPn  string    `gorm:"column:contactPn;primaryKey"`
	ContactLid string    `gorm:"column:contactLid"`
	AddedAt    time.Time `gorm:"column:addedAt;not null"`
	CreatedAt  time.Time `gorm:"column:createdAt;not null"`
}

func (UserContact) TableName() string {
	return "session_contacts"
}

type ContactResult struct {
	ContactPn  string    `json:"contact_pn"`
	ContactLid string    `json:"contact_lid"`
	AddedAt    time.Time `json:"added_at"`
	CreatedAt  time.Time `json:"created_at"`
}

func GetContacts(sessionID string) ([]ContactResult, error) {
	var contacts []ContactResult
	err := DB.Model(&UserContact{}).
		Select("contactPn, contactLid, addedAt, createdAt").
		Where("sessionId = ?", sessionID).
		Scan(&contacts).Error
	if err != nil {
		return nil, err
	}
	return contacts, nil
}

func SaveContact(contact *UserContact) error {
	return DB.Save(contact).Error
}
