import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // forward /api/availability → port 5000 root
      "/api/availability": {
        target: "http://172.25.4.99:5000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/availability/, "/"),
      },
      // forward /api/predict → port 4000
      "/api/predict": {
        target: "http://172.25.4.99:4000",
        changeOrigin: true,
      },
      // etc...
    },
  },
});
