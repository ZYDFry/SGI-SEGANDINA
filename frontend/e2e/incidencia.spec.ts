// RF-03: registro real de una incidencia desde la vista móvil de 360 × 740 (es la única prueba de Playwright
// que escribe datos: deja una incidencia con la descripción "Prueba E2E Playwright …").

import { expect, test } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, usarSesion } from "./ayudas";

capturarAlFallar();

test.describe("Registro de incidencia en el celular", () => {
  usarSesion("vigilante");
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test("CP-33 vista móvil de 360 px sin desplazamiento horizontal", async ({ page }, testInfo) => {
    caso("CP-33");
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);
    const boton = page.getByRole("button", { name: "Registrar incidencia" });
    await expect(boton).toBeVisible();
    const anchos = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, ventana: window.innerWidth }));
    expect(anchos.documento, "sin desplazamiento horizontal").toBeLessThanOrEqual(anchos.ventana);
    // El botón queda fijo abajo, dentro de la pantalla
    const caja = await boton.boundingBox();
    expect(caja && caja.y + caja.height).toBeLessThanOrEqual(740);
    await capturar(page, testInfo, "CP-33_vista_movil_360");
  });

  test("CP-31 / CP-86 registrar una incidencia con confirmación", async ({ page }, testInfo) => {
    caso("CP-31", "CP-86");
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    // Zona: la asignada viene preseleccionada; si no hay, se elige la primera activa.
    const botonZona = page.locator("#idZona");
    if ((await botonZona.innerText()).includes("Elige una zona")) {
      await botonZona.click();
      await page.getByRole("option").first().click();
    }
    await page.getByRole("radiogroup", { name: "Tipo de evento" }).getByRole("radio").first().click();
    await page.getByRole("radiogroup", { name: "Nivel de gravedad" }).getByRole("radio").first().click();
    const texto = `Prueba E2E Playwright ${new Date().toISOString()}`;
    await page.locator("#descripcion").fill(`   ${texto}   `);
    await capturar(page, testInfo, "CP-31_formulario_movil_completo", { paginaCompleta: true });

    const respuesta = page.waitForResponse((r) => r.url().endsWith("/api/incidencias") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    const r = await respuesta;
    expect(r.status()).toBe(201);
    expect(r.request().postDataJSON().descripcion, "la descripción se envía sin espacios al inicio ni al final").toBe(texto);

    await expect(page.getByRole("status").filter({ hasText: /Incidencia N\.° \d+ registrada/ })).toBeVisible();
    await expect(page.locator("#descripcion")).toHaveValue("");
    await capturar(page, testInfo, "CP-31_confirmacion_registro");
  });
});
