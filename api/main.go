package main

import (
	"api/database"
	"api/manager"
	"api/routes"
	"log"

	"github.com/gofiber/fiber/v2"
)

func main() {
	database.InitDB()

	sm := manager.NewSessionManager()
	sm.SyncFromDB()

	app := fiber.New()
	routes.RegisterRoutes(app, sm)
	log.Fatal(app.Listen(":8080"))
}
