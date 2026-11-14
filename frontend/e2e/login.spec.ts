// RF-01: login por rol con redirección y validaciones de la pantalla de login.

import { expect, test } from "@playwright/test";
import { capturar, capturarAlFallar, caso, contarPeticionesApi, credenciales, escribirSecreto, esperarPantalla, exigirCredenciales, type RolPrueba } from "./ayudas";

capturarAlFallar();

const MSJ_DNI = "El DNI debe tener 8 dígitos numéricos";

test.describe("Login: validaciones", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  });

  test("CP-70 DNI con letras: solo se escriben dígitos", async ({ page }, testInfo) => {
    caso("CP-70");
    await page.locator("#dni").click();
    await page.keyboard.type("1234567a b-");
    await expect(page.locator("#dni")).toHaveValue("1234567");
    await page.locator("#contrasena").click();
    await expect(page.locator("#error-dni")).toHaveText(MSJ_DNI);
    await capturar(page, testInfo, "CP-70_dni_con_letras", { dniFicticio: true });
  });

  test("CP-72 DNI de 7 dígitos: aviso, botón desactivado y aviso que se va con el octavo", async ({ page }, testInfo) => {
    caso("CP-72");
    await page.locator("#dni").click();
    await page.keyboard.type("1000000");
    await page.locator("#contrasena").click();
    await expect(page.locator("#error-dni")).toHaveText(MSJ_DNI);
    await expect(page.locator("#dni")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeDisabled();
    await capturar(page, testInfo, "CP-72_dni_7_digitos", { dniFicticio: true });
    await page.locator("#dni").click();
    await page.keyboard.press("End");
    await page.keyboard.type("1");
    await expect(page.locator("#error-dni")).toHaveCount(0);
  });

  test("CP-77 campos vacíos: avisos, foco en el DNI y sin petición", async ({ page }, testInfo) => {
    caso("CP-77");
    const peticiones = contarPeticionesApi(page);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.locator("#error-dni")).toHaveText("Este campo es obligatorio");
    await expect(page.locator("#error-contrasena")).toHaveText("Este campo es obligatorio");
    await expect(page.locator("#dni")).toBeFocused();
    expect(peticiones()).toBe(0);
    await capturar(page, testInfo, "CP-77_obligatorios_login", { dniFicticio: true });
  });

  test("CP-84 comportamiento de los avisos: sin aviso al abrir, aria-invalid y aria-describedby", async ({ page }, testInfo) => {
    caso("CP-84");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.locator("#dni").focus();
    await page.locator("#contrasena").focus();
    await expect(page.locator("#error-dni")).toBeVisible();
    await expect(page.locator("#error-contrasena")).toHaveCount(0);
    await expect(page.locator("#dni")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#dni")).toHaveAttribute("aria-describedby", /error-dni/);
    await capturar(page, testInfo, "CP-84_comportamiento_avisos", { dniFicticio: true });
    await page.locator("#dni").click();
    await page.keyboard.type("10000001");
    await expect(page.locator("#error-dni")).toHaveCount(0);
  });

  test("CP-03 credenciales incorrectas: mensaje genérico y sin sesión", async ({ page }, testInfo) => {
    caso("CP-03");
    const admin = credenciales("admin");
    // DNI válido con una contraseña que no es la suya (o un DNI de prueba no registrado si no hay credenciales).
    await escribirSecreto(page.locator("#dni"), admin?.dni ?? "99999999");
    await page.locator("#contrasena").fill("contrasena-incorrecta-e2e");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "DNI o contraseña incorrectos" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await capturar(page, testInfo, "CP-03_login_incorrecto_frontend");
  });
});

test.describe("Login por rol y redirección (CP-13)", () => {
  const casos: { rol: RolPrueba; destino: RegExp; menu: string[]; sinMenu: string[]; captura: string }[] = [
    { rol: "vigilante", destino: /\/incidencias\/nueva$/, menu: [], sinMenu: ["Dashboard", "Historial", "Personal"], captura: "CP-13_login_vigilante" },
    { rol: "supervisor", destino: /\/dashboard$/, menu: ["Dashboard", "Historial"], sinMenu: ["Auditoría", "Personal", "Catálogos"], captura: "CP-13_login_supervisor" },
    { rol: "admin", destino: /\/dashboard$/, menu: ["Dashboard", "Historial", "Auditoría", "Registrar incidencia", "Personal", "Catálogos"], sinMenu: [], captura: "CP-13_login_administrador" },
  ];

  for (const c of casos) {
    test(`CP-13 login correcto de ${c.rol} y su menú`, async ({ page }, testInfo) => {
      caso("CP-13");
      const datos = exigirCredenciales(c.rol);
      await page.goto("/login");
      await escribirSecreto(page.locator("#dni"), datos.dni);
      await escribirSecreto(page.locator("#contrasena"), datos.contrasena);
      await page.getByRole("button", { name: "Ingresar" }).click();
      await esperarPantalla(page, c.destino);
      const menu = page.getByRole("navigation", { name: "Menú principal" }).first();
      for (const opcion of c.menu) await expect(menu.getByRole("link", { name: opcion, exact: true })).toBeVisible();
      for (const opcion of c.sinMenu) await expect(page.getByRole("link", { name: opcion, exact: true })).toHaveCount(0);
      await capturar(page, testInfo, c.captura);
    });
  }
});
