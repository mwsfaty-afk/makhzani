import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 45000,
    // Integration tests hit the real (shared) Supabase database directly — run files
    // sequentially, not in parallel workers, to avoid cross-file interference on shared
    // tables (e.g. Plan/PlatformAdmin rows every suite reads).
    fileParallelism: false,
  },
});
