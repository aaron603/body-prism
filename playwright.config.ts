import { defineConfig, devices } from '@playwright/test'

// Uses the locally installed Chrome so no browser download is needed.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4173', channel: 'chrome', ...devices['Pixel 5'] },
  webServer: {
    command: 'pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
})
