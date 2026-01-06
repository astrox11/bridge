import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [],
  server: {
    port: 4321,
    host: "127.0.0.1",
  },
  vite: {
    server: {
      proxy: {
        "/api": { target: "http://localhost:8000", changeOrigin: true },
        "/health": { target: "http://localhost:8000", changeOrigin: true },
        "/ws": { target: "ws://localhost:8000", ws: true, changeOrigin: true },
      },
    },
    plugins: [tailwindcss()],
  },
});
