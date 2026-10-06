import { defineConfig } from "vitest/config";

/**
 * Static invariants for the deployed security rules.
 *
 * These checks are dependency-free: they assert that `firebase.json` actually
 * points at the rule files and that the server-managed collections stay outside
 * the owner-writable wildcard grant. They catch the regression class that made
 * finding #2 (client-writable `module_access`) possible without needing the
 * Firebase emulator or the Firebase CLI installed.
 *
 * A full emulator-backed run (real request.auth evaluation) requires
 * `firebase-tools` + `@firebase/rules-unit-testing`; the command is documented in
 * arshnaz-audit/round3-api.md and is intentionally NOT wired into this script so
 * that `npm run test:rules` works with the dependencies already in package.json.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["rules.test.ts"],
  },
});
