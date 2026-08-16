import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
    {
      name: "auth-1440x900",
      testMatch: /authenticated-workspace\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "auth-1280x800",
      testMatch: /authenticated-workspace\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "auth-1024x768",
      testMatch: /authenticated-workspace\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "auth-390x844",
      testMatch: /authenticated-workspace\.spec\.ts/,
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "auth-360x800",
      testMatch: /authenticated-workspace\.spec\.ts/,
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } },
    },
  ],
  ...(process.env.PLAYWRIGHT_NO_WEBSERVER === "1"
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --hostname localhost --port 3100",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
