import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// v1: static front-end, no backend. Vitest runs the pure-core unit tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
