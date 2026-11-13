import { defineConfig, devices } from "@playwright/test";

// E2E Phase 3. Tourne contre le projet Supabase DEV lié (données fictives uniquement).
// Un utilisateur de test + les dossiers créés sont préfixés « PW- » et nettoyés.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1, // base partagée + liste de dossiers à l'échelle firme → déterministe
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    storageState: "tests/e2e/.auth/state.json",
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/login",
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
