// RF-03: registro real de una incidencia desde la vista móvil de 360 × 740 (es la única prueba de Playwright
// que escribe datos: deja una incidencia con la descripción "Prueba E2E Playwright …").

import { expect, test, type Page } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, ocultarIndicadorNext, usarSesion } from "./ayudas";

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

// CP-89: el selector de zona se prueba con un catálogo ficticio de 10 zonas (se intercepta `GET /api/catalogos/zonas`)
// para no depender de los datos de la base; estas pruebas no registran nada.
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

/** Intercepta las zonas activas; la zona asignada al vigilante (leída de su sesión) se agrega activa o inactiva. */
async function simularZonas(page: Page, zonaAsignadaActiva: boolean) {
  await page.route("**/api/catalogos/zonas", async (ruta) => {
    const sesion = await page.evaluate(() => localStorage.getItem("sgi.sesion"));
    const idZona: number | null = sesion ? JSON.parse(sesion).usuario?.idZona ?? null : null;
    const asignada = idZona === null ? [] : [{ ...zona(idZona, "Zona asignada de prueba", "Breña"), estadoActivo: zonaAsignadaActiva }];
    await ruta.fulfill({ json: [...ZONAS_FICTICIAS, ...asignada] });
  });
}

test.describe("Selector de zona con búsqueda", () => {
  usarSesion("vigilante");
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test("CP-89 selector de zona con búsqueda, teclado y lista limitada", async ({ page }, testInfo) => {
    caso("CP-89");
    await simularZonas(page, true);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    // La zona del vigilante viene preseleccionada (nombre y distrito en el botón)
    const botonZona = page.locator("#idZona");
    await expect(botonZona).toContainText("Zona asignada de prueba");
    await expect(botonZona).toContainText("Breña");

    await botonZona.click();
    const buscador = page.getByRole("combobox", { name: "Buscar zona" });
    const lista = page.getByRole("listbox", { name: "Zona" });
    const opciones = lista.getByRole("option");
    await expect(buscador).toBeFocused();
    await expect(opciones).toHaveCount(10);
    // Primero la zona asignada, con la marca "Tu zona"; cada opción muestra el distrito en una segunda línea
    await expect(opciones.first()).toContainText("Tu zona");
    await expect(opciones.nth(1)).toContainText("San Martín de Porres");
    // Opciones de al menos 44 px y, con más de 8 zonas, lista limitada en altura y desplazable
    for (const indice of [0, 5, 9]) {
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
    await expect(botonZona).toContainText("Almacén Norte");
    await expect(botonZona).toBeFocused();

    // Escape cierra sin cambiar la elección
    await botonZona.click();
    await expect(buscador).toBeFocused();
    await buscador.press("Escape");
    await expect(lista).toBeHidden();
    await expect(botonZona).toBeFocused();
    await expect(botonZona).toContainText("Almacén Norte");
  });

  test("CP-89 zona obligatoria y solo zonas activas", async ({ page }, testInfo) => {
    caso("CP-89");
    await simularZonas(page, false);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    // La zona asignada está inactiva: no se preselecciona
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
    await expect(opciones.filter({ hasText: "Zona asignada de prueba" })).toHaveCount(0);
  });
});
