package database

import (
	"time"
)

type UserSettings struct {
	SessionID   string    `gorm:"column:sessionId;primaryKey"`
	ConfigKey   string    `gorm:"column:configKey;not null"`
	ConfigValue string    `gorm:"column:configValue"`
	CreatedAt   time.Time `gorm:"column:createdAt;not null;default:CURRENT_TIMESTAMP"`
}

func (UserSettings) TableName() string {
	return "session_configurations"
}

func GetUserConfig(sessionID string, key string) (string, error) {
	var config UserSettings
	err := DB.Where("sessionId = ? AND configKey = ?", sessionID, key).First(&config).Error
	if err != nil {
		return "", err
	}
	return config.ConfigValue, nil
}

func SetUserConfig(sessionID string, key string, value string) error {
	config := UserSettings{
		SessionID:   sessionID,
		ConfigKey:   key,
		ConfigValue: value,
	}
	return DB.Save(&config).Error
}

func UpdateUserSetting(sessionID string, key string, value string) error {
	return SetUserConfig(sessionID, key, value)
}

func GetAllSettingsForSession(sessionID string) ([]UserSettings, error) {
	var settings []UserSettings
	err := DB.Where("sessionId = ?", sessionID).Find(&settings).Error
	return settings, err
}
