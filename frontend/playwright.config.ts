import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Pruebas de extremo a extremo y de validación de formularios contra el frontend y el backend en ejecución.
// No levanta servidores: espera el frontend en FRONTEND_URL y la API en BASE_URL.
// Reportes en pruebas/reportes/playwright y capturas en docs/evidencias/pruebas/capturas.

const RAIZ = path.resolve(__dirname, "..");
const REPORTES = path.join(RAIZ, "pruebas", "reportes", "playwright");

export default defineConfig({
  testDir: "./e2e",
  outputDir: path.join(REPORTES, "resultados"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(REPORTES, "html"), open: "never" }],
    ["json", { outputFile: path.join(REPORTES, "resultados.json") }],
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || "http://localhost:3000",
    locale: "es-PE",
    timezoneId: "America/Lima",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    { name: "sesiones", testMatch: /sesiones\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["sesiones"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
    },
  ],
});
