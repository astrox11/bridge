import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./sql/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "dev.sqlite",
  },
});
