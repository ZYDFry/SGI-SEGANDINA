// RF-03: registro de incidencias desde la vista móvil de 360 × 740. CP-31 es la única prueba de Playwright que
// escribe datos: deja una incidencia con la descripción "Prueba E2E Playwright …". Las demás simulan el catálogo de
// zonas, el usuario (`GET /api/auth/yo`) y el registro con `page.route`, para no depender de la base ni escribir.

import { expect, test, type Page } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, ocultarIndicadorNext, usarSesion } from "./ayudas";

capturarAlFallar();

const MOVIL = { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true };

test.describe("Registro de incidencia en el celular", () => {
  usarSesion("vigilante");
  test.use(MOVIL);

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

    // El vigilante de prueba debe tener una zona activa: se muestra fija, sin selector
    await expect(page.locator("#titulo-zona")).toHaveText("Zona asignada");
    await expect(page.getByRole("combobox"), "sin selector de zona").toHaveCount(0);
    await expect(page.locator("#idZona [role=alert]"), "el vigilante de prueba necesita una zona asignada y activa").toHaveCount(0);
    const idZonaSesion = await page.evaluate(() => JSON.parse(localStorage.getItem("sgi.sesion") ?? "{}").usuario?.idZona);

    await page.getByRole("radiogroup", { name: "Tipo de evento" }).getByRole("radio").first().click();
    await page.getByRole("radiogroup", { name: "Nivel de gravedad" }).getByRole("radio").first().click();
    const texto = `Prueba E2E Playwright ${new Date().toISOString()}`;
    await page.locator("#descripcion").fill(`   ${texto}   `);
    await capturar(page, testInfo, "CP-31_formulario_movil_completo", { paginaCompleta: true });

    const respuesta = page.waitForResponse((r) => r.url().endsWith("/api/incidencias") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    const r = await respuesta;
    expect(r.status()).toBe(201);
    const cuerpo = r.request().postDataJSON();
    expect(cuerpo.descripcion, "la descripción se envía sin espacios al inicio ni al final").toBe(texto);
    expect(cuerpo.idZona, "se envía la zona asignada").toBe(idZonaSesion);

    await expect(page.getByRole("status").filter({ hasText: /Incidencia N\.° \d+ registrada/ })).toBeVisible();
    await expect(page.locator("#descripcion")).toHaveValue("");
    await capturar(page, testInfo, "CP-31_confirmacion_registro");
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Datos simulados

interface ZonaFicticia {
  idZona: number;
  nombreZona: string;
  departamento: string;
  provincia: string;
  distrito: string;
  referencia: string | null;
  descripcion: string | null;
  estadoActivo: boolean;
}

function zona(idZona: number, nombreZona: string, distrito: string, referencia: string | null = null): ZonaFicticia {
  return { idZona, nombreZona, departamento: "Lima", provincia: "Lima", distrito, referencia, descripcion: null, estadoActivo: true };
}

const ZONAS_FICTICIAS: ZonaFicticia[] = [
  zona(9001, "Almacén Norte", "San Martín de Porres"),
  zona(9002, "Centro Empresarial Pardo", "Miraflores", "Frente al parque Kennedy"),
  zona(9003, "Condominio Las Flores", "Santiago de Surco"),
  zona(9004, "Planta Industrial Sur", "Lurín"),
  zona(9005, "Torre Javier Prado", "San Isidro"),
  zona(9006, "Clínica del Rímac", "Rímac"),
  zona(9007, "Colegio Los Olivos", "Los Olivos"),
  zona(9008, "Mercado Central", "Cercado de Lima"),
  zona(9009, "Puerto Seco Callao", "Callao"),
];

/** Zona asignada al vigilante en CP-105. */
const ZONA_ASIGNADA = zona(9100, "Zona asignada de prueba", "Breña");

/** Intercepta las zonas activas del formulario con el catálogo ficticio más las zonas extra indicadas. */
async function simularZonas(page: Page, extra: ZonaFicticia[] = []) {
  await page.route("**/api/catalogos/zonas", (ruta) => ruta.fulfill({ json: [...ZONAS_FICTICIAS, ...extra] }));
}

/** Responde `GET /api/auth/yo` con el usuario real de la sesión, pero con la zona asignada indicada. */
async function simularZonaDelUsuario(page: Page, idZona: number | null) {
  await page.route("**/api/auth/yo", async (ruta) => {
    const real = await ruta.fetch();
    await ruta.fulfill({ response: real, json: { ...(await real.json()), idZona } });
  });
}

/** Responde el registro con un 201 ficticio armado con lo enviado (no escribe en la base). */
async function simularRegistro(page: Page) {
  await page.route("**/api/incidencias", async (ruta) => {
    if (ruta.request().method() !== "POST") return ruta.fallback();
    const enviado = ruta.request().postDataJSON();
    const zonaEnviada = [...ZONAS_FICTICIAS, ZONA_ASIGNADA].find((z) => z.idZona === enviado.idZona) ?? ZONA_ASIGNADA;
    await ruta.fulfill({
      status: 201,
      json: {
        idIncidencia: 999999,
        fechaHora: new Date().toISOString(),
        descripcion: enviado.descripcion,
        zona: zonaEnviada,
        tipoEvento: { idTipoEvento: enviado.idTipoEvento, nombreTipoEvento: "Tipo de prueba", estadoActivo: true },
        nivelGravedad: { idNivelGravedad: enviado.idNivelGravedad, nombreNivel: "Nivel de prueba", orden: 1, estadoActivo: true },
        idUsuario: 0,
      },
    });
  });
}

/** Elige el primer tipo y el primer nivel y escribe una descripción válida. */
async function completarResto(page: Page) {
  await page.getByRole("radiogroup", { name: "Tipo de evento" }).getByRole("radio").first().click();
  await page.getByRole("radiogroup", { name: "Nivel de gravedad" }).getByRole("radio").first().click();
  await page.locator("#descripcion").fill("Prueba simulada: no se guarda en la base de datos");
}

// ---------------------------------------------------------------------------------------------------------------
// CP-105: el Vigilante solo registra en su zona asignada

test.describe("Zona fija del Vigilante", () => {
  usarSesion("vigilante");
  test.use(MOVIL);

  test("CP-105 el Vigilante ve su zona fija y registra en ella", async ({ page }, testInfo) => {
    caso("CP-105");
    await simularZonas(page, [ZONA_ASIGNADA]);
    await simularZonaDelUsuario(page, ZONA_ASIGNADA.idZona);
    await simularRegistro(page);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    const tarjeta = page.locator("#idZona");
    // Título "Zona asignada" fuera de la tarjeta; dentro, solo el nombre y el distrito
    await expect(page.locator("#titulo-zona")).toHaveText("Zona asignada");
    await expect(tarjeta).toContainText("Zona asignada de prueba");
    await expect(tarjeta).toContainText("Breña");
    await expect(tarjeta).not.toContainText("Tu zona");
    // Sin selector: ni botón para abrir la lista ni buscador
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await completarResto(page);
    await capturar(page, testInfo, "CP-105_zona_fija");

    const respuesta = page.waitForRequest((r) => r.url().endsWith("/api/incidencias") && r.method() === "POST");
    await ocultarIndicadorNext(page);
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    expect((await respuesta).postDataJSON().idZona, "se envía el id de la zona asignada").toBe(ZONA_ASIGNADA.idZona);
    await expect(page.getByRole("status").filter({ hasText: "Incidencia N.° 999999 registrada" })).toBeVisible();
  });

  test("CP-105 sin zona asignada no puede registrar", async ({ page }, testInfo) => {
    caso("CP-105");
    await simularZonas(page);
    await simularZonaDelUsuario(page, null);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    await expect(page.locator("#idZona")).toContainText("No tienes una zona asignada; avisa al Administrador.");
    const boton = page.getByRole("button", { name: "Registrar incidencia" });
    await expect(boton).toBeDisabled();
    await expect(boton).toHaveAttribute("aria-describedby", "motivo-incidencia");
    await expect(page.locator("#motivo-incidencia")).toHaveText("No tienes una zona asignada; avisa al Administrador.");
    await capturar(page, testInfo, "CP-105_sin_zona");
  });

  test("CP-105 con la zona asignada inactiva no puede registrar", async ({ page }, testInfo) => {
    caso("CP-105");
    // La zona asignada no viene en el catálogo de activas
    await simularZonas(page);
    await simularZonaDelUsuario(page, ZONA_ASIGNADA.idZona);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    await expect(page.locator("#idZona")).toContainText("Tu zona asignada está inactiva; avisa al Administrador.");
    await expect(page.getByRole("button", { name: "Registrar incidencia" })).toBeDisabled();
    await expect(page.locator("#motivo-incidencia")).toHaveText("Tu zona asignada está inactiva; avisa al Administrador.");
    await capturar(page, testInfo, "CP-105_zona_inactiva");
  });
});

// ---------------------------------------------------------------------------------------------------------------
// CP-89 y CP-106: el Administrador elige la zona con el selector con búsqueda

test.describe("Selector de zona con búsqueda (Administrador)", () => {
  usarSesion("admin");
  test.use(MOVIL);

  test("CP-89 selector de zona con búsqueda, teclado y lista limitada", async ({ page }, testInfo) => {
    caso("CP-89");
    await simularZonas(page);
    await simularZonaDelUsuario(page, null);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    // Sin zona elegida al abrir
    const botonZona = page.locator("#idZona");
    await expect(botonZona).toContainText("Elige una zona");

    await botonZona.click();
    const buscador = page.getByRole("combobox", { name: "Buscar zona" });
    const lista = page.getByRole("listbox", { name: "Zona" });
    const opciones = lista.getByRole("option");
    await expect(buscador).toBeFocused();
    await expect(opciones).toHaveCount(ZONAS_FICTICIAS.length);
    // Cada opción muestra el distrito en una segunda línea
    await expect(opciones.first()).toContainText("San Martín de Porres");
    // Opciones de al menos 44 px y, con más de 8 zonas, lista limitada en altura y desplazable
    for (const indice of [0, 4, 8]) {
      const caja = await opciones.nth(indice).boundingBox();
      expect(caja?.height ?? 0, "opción de al menos 44 px").toBeGreaterThanOrEqual(44);
    }
    const alturas = await lista.evaluate((ul) => ({ visible: ul.clientHeight, contenido: ul.scrollHeight }));
    expect(alturas.contenido, "la lista se desplaza").toBeGreaterThan(alturas.visible);
    await capturar(page, testInfo, "CP-89_selector_zona_busqueda");

    // Búsqueda sin distinguir mayúsculas ni tildes, por distrito y por referencia
    await buscador.fill("SAN MARTIN");
    await expect(opciones).toHaveCount(1);
    await expect(opciones.first()).toContainText("Almacén Norte");
    await buscador.fill("kennedy");
    await expect(opciones).toHaveCount(1);
    await expect(opciones.first()).toContainText("Centro Empresarial Pardo");
    await buscador.fill("almacen");
    await expect(opciones).toHaveCount(1);
    await buscador.fill("zzz");
    await expect(opciones).toHaveCount(0);
    await expect(lista).toContainText("Sin coincidencias");

    // Teclado: Inicio, ↓ y Enter eligen la segunda opción; el botón la muestra y recibe el foco
    await buscador.fill("");
    await buscador.press("Home");
    await buscador.press("ArrowDown");
    await expect(opciones.nth(1)).toHaveAttribute("aria-selected", "true");
    await buscador.press("Enter");
    await expect(lista).toBeHidden();
    await expect(botonZona).toContainText("Centro Empresarial Pardo");
    await expect(botonZona).toBeFocused();

    // Escape cierra sin cambiar la elección
    await botonZona.click();
    await expect(buscador).toBeFocused();
    await buscador.press("Escape");
    await expect(lista).toBeHidden();
    await expect(botonZona).toBeFocused();
    await expect(botonZona).toContainText("Centro Empresarial Pardo");
  });

  test("CP-89 zona obligatoria y solo zonas activas", async ({ page }, testInfo) => {
    caso("CP-89");
    await simularZonas(page, [{ ...zona(9010, "Zona desactivada de prueba", "Breña"), estadoActivo: false }]);
    await simularZonaDelUsuario(page, null);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    const botonZona = page.locator("#idZona");
    await expect(botonZona).toContainText("Elige una zona");

    await ocultarIndicadorNext(page); // en `npm run dev` tapa el botón fijo
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    await expect(page.locator("#error-idZona")).toHaveText("Elige una zona");
    await expect(botonZona).toBeFocused();
    await expect(botonZona).toHaveAttribute("aria-describedby", "error-idZona");
    await capturar(page, testInfo, "CP-89_zona_obligatoria");

    // Solo se listan las zonas activas
    await botonZona.click();
    const opciones = page.getByRole("listbox", { name: "Zona" }).getByRole("option");
    await expect(opciones).toHaveCount(ZONAS_FICTICIAS.length);
    await expect(opciones.filter({ hasText: "Zona desactivada de prueba" })).toHaveCount(0);
  });

  test("CP-106 el Administrador elige cualquier zona activa", async ({ page }, testInfo) => {
    caso("CP-106");
    await simularZonas(page);
    // Con zona propia (Almacén Norte), que aparece primero con la marca "Tu zona"
    await simularZonaDelUsuario(page, 9001);
    await simularRegistro(page);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    const botonZona = page.locator("#idZona");
    await botonZona.click();
    const opciones = page.getByRole("listbox", { name: "Zona" }).getByRole("option");
    await expect(opciones.first()).toContainText("Tu zona");
    await page.getByRole("combobox", { name: "Buscar zona" }).fill("javier prado");
    await opciones.first().click();
    await expect(botonZona).toContainText("Torre Javier Prado");
    await completarResto(page);
    await capturar(page, testInfo, "CP-106_admin_elige_zona");

    const respuesta = page.waitForRequest((r) => r.url().endsWith("/api/incidencias") && r.method() === "POST");
    await ocultarIndicadorNext(page);
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    expect((await respuesta).postDataJSON().idZona, "se envía la zona elegida, distinta de la propia").toBe(9005);
    await expect(page.getByRole("status").filter({ hasText: "Incidencia N.° 999999 registrada" })).toBeVisible();
  });
});
