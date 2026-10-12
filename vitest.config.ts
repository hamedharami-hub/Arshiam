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
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "api/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "firebase/app": path.resolve(__dirname, "./node_modules/firebase/app/dist/esm/index.esm.js"),
      "firebase/auth": path.resolve(__dirname, "./node_modules/firebase/auth/dist/esm/index.esm.js"),
      "firebase/storage": path.resolve(__dirname, "./node_modules/firebase/storage/dist/esm/index.esm.js"),
      "firebase/firestore": path.resolve(__dirname, "./node_modules/firebase/firestore/dist/esm/index.esm.js"),
    },
    conditions: ["browser"],
  },
});
