import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    maxWorkers: 2,
    minWorkers: 2,
    // The Knowledge/DocumentEditor suites are genuinely heavy (one file takes
    // ~150s for 18 tests on this hardware, i.e. ~8s per test). With the default
    // 5s/10s budget they timed out non-deterministically and turned the suite
    // into a coin flip instead of a safety net (audit finding code-bugs #19).
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["./src/test/setup.ts"],
    // API functions live outside this project; run them with `npm run test:api`
    // (vitest.api.config.ts). The previous "api/**" glob resolved to the
    // non-existent frontend/api and silently ran nothing.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
