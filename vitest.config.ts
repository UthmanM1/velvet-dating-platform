import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Test-only value so the administrator demo account is seeded; never used in deployments.
    env: { DEMO_ADMIN_PASSWORD: "Test-Only-Admin-Password-1!" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
