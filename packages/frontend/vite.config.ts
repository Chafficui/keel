import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3005",
        changeOrigin: true,
        configure: (proxy) => {
          // Suppress proxy errors during startup (backend not ready yet)
          proxy.on("error", (_err, _req, res) => {
            if ("writeHead" in res && typeof res.writeHead === "function") {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend not ready" }));
            }
          });
        },
      },
    },
  },
});
