import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/demo",
  timeout: 120000,
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  outputDir: "test-results/demo",
  use: { baseURL: "http://127.0.0.1:3127", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        video: { mode: "on", size: { width: 1280, height: 800 } },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        viewport: { width: 390, height: 844 },
        video: { mode: "on", size: { width: 390, height: 844 } },
      },
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
