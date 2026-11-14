// Menú de navegación por rol: barra inferior del Vigilante en el celular, panel con grupos en tablet y barra
// lateral en escritorio. Solo navega: no escribe datos.

import { expect, test } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, ocultarIndicadorNext, usarSesion } from "./ayudas";

capturarAlFallar();

test.describe("Vigilante en el celular", () => {
  usarSesion("vigilante");
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test("CP-107 el Vigilante a 360 px ve la barra inferior y navega", async ({ page }, testInfo) => {
    caso("CP-107");
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);
    await ocultarIndicadorNext(page);

    const barra = page.getByRole("navigation", { name: "Navegación inferior" });
    await expect(barra).toBeVisible();
    const registrar = barra.getByRole("link", { name: "Registrar", exact: true });
    const miCuenta = barra.getByRole("button", { name: "Mi cuenta" });
    await expect(registrar).toHaveAttribute("aria-current", "page");
    await expect(miCuenta).toBeVisible();
    await expect(barra.getByText("Mis incidencias")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Menú", exact: true })).toBeHidden();
    await expect(page.getByTestId("titulo-pantalla")).toHaveText("Registrar incidencia");

    // El botón fijo del formulario queda por encima de la barra, sin taparse
    const cajaBoton = await page.getByRole("button", { name: "Registrar incidencia" }).boundingBox();
    const cajaBarra = await barra.boundingBox();
    expect(cajaBoton && cajaBarra && cajaBoton.y + cajaBoton.height).toBeLessThanOrEqual(cajaBarra!.y + 1);
    await capturar(page, testInfo, "CP-107_barra_inferior");

    // "Mi cuenta" abre la hoja con el cambio de contraseña y el cierre de sesión
    await expect(miCuenta).toHaveAttribute("aria-expanded", "false");
    await miCuenta.click();
    const hoja = page.getByRole("dialog", { name: "Mi cuenta" });
    await expect(hoja).toBeVisible();
    await expect(miCuenta).toHaveAttribute("aria-expanded", "true");
    await expect(hoja.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await capturar(page, testInfo, "CP-107_mi_cuenta");

    await hoja.getByRole("link", { name: "Cambiar mi contraseña" }).click();
    await esperarPantalla(page, /\/mi-contrasena$/);
    await expect(hoja).toBeHidden();
    await expect(miCuenta).toHaveAttribute("aria-current", "page");
    await expect(registrar).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("titulo-pantalla")).toHaveText("Cambiar mi contraseña");

    await registrar.click();
    await esperarPantalla(page, /\/incidencias\/nueva$/);
    await expect(registrar).toHaveAttribute("aria-current", "page");
  });
});

test.describe("Supervisor en tablet", () => {
  usarSesion("supervisor");
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });

  test("CP-108 el Supervisor en tablet abre el menú, ve los grupos y lo cierra con Escape", async ({ page }, testInfo) => {
    caso("CP-108");
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);
    await expect(page.getByRole("navigation", { name: "Navegación inferior" })).toHaveCount(0);

    const botonMenu = page.getByRole("button", { name: "Menú", exact: true });
    await expect(botonMenu).toBeVisible();
    await expect(botonMenu).toHaveAttribute("aria-expanded", "false");
    await botonMenu.click();

    const panel = page.getByRole("dialog", { name: "Menú" });
    await expect(panel).toBeVisible();
    await expect(botonMenu).toHaveAttribute("aria-controls", "menu-panel");
    await expect(panel.getByRole("heading", { name: "Gestión" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Administración" })).toHaveCount(0);
    await expect(panel.getByRole("link", { name: "Dashboard", exact: true })).toBeFocused();
    await expect(panel.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(panel.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await capturar(page, testInfo, "CP-108_menu_tablet");

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(botonMenu).toHaveAttribute("aria-expanded", "false");
    await expect(botonMenu).toBeFocused();
  });
});

test.describe("Administrador en escritorio", () => {
  usarSesion("admin");

  test("CP-109 en escritorio la barra lateral marca la opción activa", async ({ page }, testInfo) => {
    caso("CP-109");
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);

    const lateral = page.getByRole("complementary", { name: "Menú lateral" });
    await expect(lateral).toBeVisible();
    await expect(page.getByRole("button", { name: "Menú", exact: true })).toBeHidden();
    for (const grupo of ["Gestión", "Administración", "Mi cuenta"]) {
      await expect(lateral.getByRole("heading", { name: grupo })).toBeVisible();
    }
    await expect(lateral.locator("svg")).not.toHaveCount(0);
    await expect(lateral.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("titulo-pantalla")).toHaveText("Dashboard");

    await lateral.getByRole("link", { name: "Auditoría", exact: true }).click();
    await esperarPantalla(page, /\/historial\/auditoria$/);
    await expect(lateral.getByRole("link", { name: "Auditoría", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(lateral.getByRole("link", { name: "Historial", exact: true })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("titulo-pantalla")).toHaveText("Auditoría");
    await capturar(page, testInfo, "CP-109_barra_lateral");
  });
});
