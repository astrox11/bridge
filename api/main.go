package main

import (
	"api/database"
	"api/manager"
	"api/routes"
	"log"
	"os"

	"bufio"
	"bytes"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func main() {
	database.InitDB()

	sm := manager.NewSessionManager()
	sm.SyncFromDB()

	app := fiber.New()
	routes.RegisterRoutes(app, sm)

	env, _ := os.ReadFile("../.env")
	port, ok := parseEnv(env)["PORT"]
	if !ok {
		port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}

func parseEnv(buffer []byte) map[string]string {
	env := make(map[string]string)
	scanner := bufio.NewScanner(bytes.NewReader(buffer))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		env[key] = val
	}

	return env
}
