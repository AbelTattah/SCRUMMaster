import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: {
      APP_TIMEZONE: "Africa/Accra",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
  },
});
