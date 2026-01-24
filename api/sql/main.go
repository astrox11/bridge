package database

import (
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func SyncDB() {
	var err error
	path := "../dev.sqlite"

	DB, err = gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB.Exec("PRAGMA journal_mode=WAL;")
	DB.Exec("PRAGMA foreign_keys = ON;")

	err = DB.AutoMigrate(
		&Session{},
		&UserSettings{},
		&UserContact{},
		&GroupMetadata{},
	)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}
}
