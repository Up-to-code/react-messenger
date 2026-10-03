import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3127",
    trace: "retain-on-failure",
    video:
      process.env.RECORD_DEMO_VIDEO === "1"
        ? { mode: "on", size: { width: 1280, height: 720 } }
        : "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
  webServer: {
    env: {
      AGENT_BACKEND: "demo",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
      OPENROUTER_API_KEY: "",
      OPENROUTER_MODEL: "",
    },
    command: "npm run start -- --hostname 127.0.0.1 --port 3127",
    url: "http://127.0.0.1:3127",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
