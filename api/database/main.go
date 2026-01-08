package database

import (
	"fmt"
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	path := "../core/whatsaly_dev.sqlite"

	DB, err = gorm.Open(sqlite.Open(path), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB.Exec("PRAGMA journal_mode=WAL;")

	fmt.Printf("Connected to shared database at %s (Pure-Go Driver)\n", path)

	err = DB.AutoMigrate(&Session{})
	if err != nil {
		log.Fatal("Migration failed:", err)
	}
}
