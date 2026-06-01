import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// v1: static front-end, no backend. Vitest runs the pure-core unit tests.
// vite-plugin-pwa makes it installable + offline (Workbox precaches the app shell);
// it is build/dev-only and does not affect the vitest run.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Финский тренажёр",
        short_name: "Suomi",
        description: "Ежедневный тренажёр финского языка для русскоговорящих.",
        lang: "ru",
        start_url: "/",
        display: "standalone",
        background_color: "#f7f1e8",
        theme_color: "#f7f1e8",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
