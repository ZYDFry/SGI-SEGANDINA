// Ayudas comunes de las pruebas de Playwright: credenciales desde variables de entorno, sesiones por rol y
// capturas nombradas con el ID del caso, con contraseñas, tokens y DNIs ocultos.

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export type RolPrueba = "admin" | "supervisor" | "vigilante";

export const API_URL = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
export const DIR_CAPTURAS = path.resolve(__dirname, "..", "..", "docs", "evidencias", "pruebas", "capturas");
export const DIR_SESIONES = path.resolve(__dirname, ".auth");

const VARIABLES: Record<RolPrueba, [string, string]> = {
  admin: ["E2E_ADMIN_DNI", "E2E_ADMIN_PASSWORD"],
  supervisor: ["E2E_SUPERVISOR_DNI", "E2E_SUPERVISOR_PASSWORD"],
  vigilante: ["E2E_VIGILANTE_DNI", "E2E_VIGILANTE_PASSWORD"],
};

/** DNI y contraseña del rol, o null si faltan sus variables de entorno. */
export function credenciales(rol: RolPrueba): { dni: string; contrasena: string } | null {
  const [varDni, varContrasena] = VARIABLES[rol];
  const dni = process.env[varDni];
  const contrasena = process.env[varContrasena];
  return dni && contrasena ? { dni, contrasena } : null;
}

/** Salta la prueba con un motivo claro si faltan las credenciales del rol. */
export function exigirCredenciales(rol: RolPrueba): { dni: string; contrasena: string } {
  const datos = credenciales(rol);
  const [varDni, varContrasena] = VARIABLES[rol];
  test.skip(!datos, `Faltan ${varDni} y/o ${varContrasena}`);
  return datos!;
}

/** Archivo de storageState con la sesión del rol (lo crea sesiones.setup.ts). */
export function archivoSesion(rol: RolPrueba): string {
  return path.join(DIR_SESIONES, `${rol}.json`);
}

/** Usa la sesión guardada del rol; salta la prueba si no se pudo crear. */
export function usarSesion(rol: RolPrueba) {
  const archivo = archivoSesion(rol);
  // Se resuelve al crear el contexto (después del proyecto "sesiones"), no al cargar el archivo.
  test.use({
    storageState: async ({}, entregar, testInfo) => {
      testInfo.skip(!fs.existsSync(archivo), `No hay sesión de ${rol}: revisa sus variables E2E_* y que el backend esté corriendo`);
      await entregar(archivo);
    },
  });
}

/** Registra el ID del caso del plan de pruebas en el reporte de Playwright. */
export function caso(...ids: string[]) {
  for (const id of ids) test.info().annotations.push({ type: "caso", description: id });
}

/** Oculta el indicador flotante de Next (en `npm run dev` tapa el botón fijo de la vista móvil). */
export async function ocultarIndicadorNext(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }" });
}

/**
 * Captura de pantalla `CP-xx_descripcion.png` en docs/evidencias/pruebas/capturas, adjunta al reporte.
 * Tapa los campos de contraseña, los DNI (campos y textos de 8 dígitos) y la búsqueda de auditoría y personal.
 */
export async function capturar(
  page: Page,
  testInfo: TestInfo,
  nombre: string,
  opciones: { paginaCompleta?: boolean; /** El DNI escrito es ficticio (pruebas de validación): se deja visible. */ dniFicticio?: boolean } = {},
) {
  fs.mkdirSync(DIR_CAPTURAS, { recursive: true });
  await ocultarIndicadorNext(page);
  const archivo = path.join(DIR_CAPTURAS, `${nombre}.png`);
  await page.screenshot({
    path: archivo,
    fullPage: opciones.paginaCompleta ?? false,
    animations: "disabled",
    mask: [
      page.locator('input[type="password"]'),
      ...(opciones.dniFicticio ? [] : [page.locator("#dni")]),
      page.locator("#q"),
      page.locator("#filtro-q"),
      page.getByText(/\b\d{8}\b/),
    ],
    maskColor: "#1e3a8a",
  });
  await testInfo.attach(nombre, { path: archivo, contentType: "image/png" });
}

/** Cuenta las peticiones a la API hechas desde la página (para comprobar que un formulario inválido no envía). */
export function contarPeticionesApi(page: Page, metodo?: string): () => number {
  let total = 0;
  page.on("request", (peticion) => {
    if (peticion.url().startsWith(API_URL) && (!metodo || peticion.method() === metodo)) total += 1;
  });
  return () => total;
}

/** Espera a que la pantalla privada termine de cargar la sesión ("Cargando…"). */
export async function esperarPantalla(page: Page, ruta: string | RegExp) {
  await expect(page).toHaveURL(ruta);
  // Con cacheComponents, Next deja la ruta anterior oculta en el DOM: solo cuenta un "Cargando…" visible.
  await expect(page.getByText("Cargando…", { exact: true }).filter({ visible: true })).toHaveCount(0);
}

/**
 * Escribe un dato sensible (DNI o contraseña reales) sin que su valor quede en el reporte de Playwright:
 * `fill` y `type` guardan el texto en el título del paso, `evaluate` no. Usa el setter nativo y dispara
 * `input` para que React reciba el cambio igual que al escribir.
 */
export async function escribirSecreto(campo: Locator, valor: string) {
  await campo.focus();
  await campo.evaluate((elemento, texto) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(elemento, texto);
    elemento.dispatchEvent(new Event("input", { bubbles: true }));
  }, valor);
}

/**
 * Registra un `afterEach` que, si la prueba falla, guarda `CP-xx_fallo.png` (el primer caso del título) como
 * evidencia del estado de la pantalla en el momento del fallo. Se llama una vez al inicio de cada archivo de pruebas.
 */
export function capturarAlFallar() {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus || testInfo.status === "skipped") return;
    const caso = testInfo.title.match(/CP-\d+/)?.[0];
    if (!caso) return;
    try {
      await capturar(page, testInfo, `${caso}_fallo`, { paginaCompleta: true });
    } catch {
      // La página ya no está disponible: el fallo queda solo en el reporte de Playwright.
    }
  });
}
