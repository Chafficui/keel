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
          // Suppress proxy errors during startup (backend not ready yet).
          // Without this handler Vite prints noisy ECONNREFUSED stack traces
          // while the backend is still booting.
          proxy.on("error", (err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend not ready" }));
            }
            // Log a single-line notice instead of a full stack trace
            if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
              // Silently swallow — expected during startup
              return;
            }
          });
        },
      },
    },
  },
});
