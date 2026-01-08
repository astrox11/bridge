package routes

import (
	"api/manager"
	"bufio"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"
)

func RegisterRoutes(app *fiber.App, sm *manager.SessionManager) {
	api := app.Group("/api")

	api.Post("/instances/:phone/pair", func(c *fiber.Ctx) error {
		phone := c.Params("phone")

		worker, ok := sm.GetWorker(phone)
		if ok {
			status := worker.GetStatus()

			if status == "active" || status == "connected" {
				return c.Status(400).JSON(fiber.Map{"error": "instance already connected"})
			}
		}

		if err := sm.StartInstance(phone, "pairing"); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to initialize pairing"})
		}

		return c.JSON(fiber.Map{
			"status":  "pairing",
			"message": "Starting instance to generate pairing code",
			"phone":   phone,
		})
	})

	api.Post("/instances/:phone/start", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.StartInstance(phone, "starting"); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "starting", "phone": phone})
	})

	api.Get("/instances/:phone", func(c *fiber.Ctx) error {
		phone := c.Params("phone")

		worker, ok := sm.GetWorker(phone)
		if !ok {
			return c.Status(404).JSON(fiber.Map{"error": "instance not found"})
		}
		return c.JSON(worker.GetData())
	})

	api.Post("/instances/:phone/pause", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.TogglePause(phone, true); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "paused"})
	})

	api.Post("/instances/:phone/resume", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.TogglePause(phone, false); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "resuming"})
	})

	api.Post("/instances/:phone/reset", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.ResetSession(phone); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to clear Redis"})
		}
		return c.JSON(fiber.Map{"message": "Redis cleared. You can now request a new pairing code."})
	})

	SystemRoutes(api)
}

func SystemRoutes(api fiber.Router) {
	api.Get("/system/stream", func(c *fiber.Ctx) error {
		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")

		c.Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
			for {
				stats := manager.GetSystemStats()
				data, _ := json.Marshal(stats)

				fmt.Fprintf(w, "data: %s\n\n", string(data))

				if err := w.Flush(); err != nil {
					fmt.Println("Client disconnected from stream")
					return
				}

				time.Sleep(2 * time.Second)
			}
		}))

		return nil
	})
}
