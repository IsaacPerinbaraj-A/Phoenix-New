import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Development proxy: the frontend talks to the FastAPI backend.
// Default is http://localhost:8000; override when the backend runs
// elsewhere (e.g. port 8000 is occupied by another application):
//   PowerShell:  $env:DERMATRIAGE_BACKEND="http://localhost:8020"; npm run dev
//   bash:        DERMATRIAGE_BACKEND=http://localhost:8020 npm run dev
const backend = process.env.DERMATRIAGE_BACKEND || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": backend,
      "/static": backend,
    },
  },
});
