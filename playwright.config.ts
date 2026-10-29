import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3021",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "FABRIC_DATA_DIR=.data/e2e next start --hostname 127.0.0.1 --port 3021",
    url: "http://127.0.0.1:3021",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
