import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split stable vendor code from app code so route chunks stay small
        // and libraries cache independently of app deploys.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-leaflet": ["leaflet", "react-leaflet", "leaflet.markercluster"],
          "vendor-charts": ["recharts"],
          "vendor-motion": ["motion"],
        },
      },
    },
  },
});
