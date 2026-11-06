import { defineConfig, devices } from '@playwright/test';

// Smoke tests do Argos Track. Sobem o dev server (Vite) automaticamente e validam
// que a aplicação carrega. O caminho autenticado (login + mapa) só roda quando
// E2E_EMAIL/E2E_PASSWORD estão definidos no ambiente (e o backend está acessível).
const port = Number(process.env.E2E_PORT || 3000);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Ambientes que já têm um Chromium instalado (CI/containers) podem apontá-lo em
  // PW_CHROMIUM_PATH em vez de baixar outro com `npx playwright install`.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_CHROMIUM_PATH
          ? {
              launchOptions: {
                executablePath: process.env.PW_CHROMIUM_PATH,
                args: ['--no-sandbox'],
              },
            }
          : {}),
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
