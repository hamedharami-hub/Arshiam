import { defineConfig } from "vitest/config";

/**
 * The API functions in /api are plain Node modules (no DOM), so they need their
 * own Vitest project: the app config under frontend/vitest.config.ts resolves
 * `api/**` relative to `frontend/`, where no such directory exists, which is why
 * these suites never ran. See package.json script `test:api`.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["../api/**/*.{test,spec}.{ts,tsx}"],
  },
});
