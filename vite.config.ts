import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// AIRP UI dev server. Port is fixed so the Tauri shell can point at it.
export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
