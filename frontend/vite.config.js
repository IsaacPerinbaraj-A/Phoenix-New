import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Development proxy: the frontend talks to the FastAPI backend on :8000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/static": "http://localhost:8000",
    },
  },
});
