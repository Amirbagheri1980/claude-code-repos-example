import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Each spec now creates its own isolated room, so parallel execution would
  // likely be safe, but keeping this serial for now is a deliberate, separate
  // decision from the room-creation feature itself.
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
