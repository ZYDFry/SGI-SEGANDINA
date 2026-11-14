// RF-01 / RF-09: una ruta de otro rol escrita en la barra redirige al inicio del rol.

import { expect, test } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, usarSesion } from "./ayudas";

capturarAlFallar();

test.describe("Vigilante en rutas de gerencia y de administración", () => {
  usarSesion("vigilante");

  test("CP-13 / CP-103 el Vigilante vuelve a su formulario", async ({ page }, testInfo) => {
    caso("CP-13", "CP-103");
    for (const ruta of ["/dashboard", "/historial", "/historial/auditoria", "/personal", "/catalogos", "/catalogos/tipos-evento", "/catalogos/niveles-gravedad"]) {
      await page.goto(ruta);
      await esperarPantalla(page, /\/incidencias\/nueva$/);
    }
    await expect(page.getByRole("link", { name: "Personal", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Catálogos", exact: true })).toHaveCount(0);
    await capturar(page, testInfo, "CP-103_vigilante_redirigido");
  });
});

test.describe("Supervisor en rutas del Administrador", () => {
  usarSesion("supervisor");

  test("CP-13 / CP-103 el Supervisor vuelve al dashboard", async ({ page }, testInfo) => {
    caso("CP-13", "CP-103");
    for (const ruta of ["/historial/auditoria", "/personal", "/catalogos", "/catalogos/tipos-evento", "/catalogos/niveles-gravedad"]) {
      await page.goto(ruta);
      await esperarPantalla(page, /\/dashboard$/);
    }
    await expect(page.getByRole("link", { name: "Auditoría", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Personal", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Catálogos", exact: true })).toHaveCount(0);
    await capturar(page, testInfo, "CP-103_supervisor_redirigido");
  });
});
