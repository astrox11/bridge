package routes

import (
	"net/url"

	"github.com/gofiber/fiber/v2"
)

func UtilRoutes(app *fiber.App) {
	api := app.Group("/util")

	api.Get("/url/*", func(c *fiber.Ctx) error {
		args := c.Params("*")

		u, err := url.Parse(args)

		if err != nil || u.Scheme == "" || u.Host == "" {
			return c.Status(400).JSON(fiber.Map{
				"status": false,
			})
		}

		return c.JSON(fiber.Map{
			"status": true,
		})
	})
}
