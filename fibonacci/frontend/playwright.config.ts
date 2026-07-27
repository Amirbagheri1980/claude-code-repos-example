import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // The backend has a single global active chat (no rooms/join-codes), so
  // specs can't safely run concurrently against it.
  fullyParallel: false,
  workers: 1,
  webServer: [
    {
      command: 'dotnet run --project ../backend/Api',
      url: 'http://localhost:5080/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: {
    baseURL: 'http://localhost:5173',
  },
})
