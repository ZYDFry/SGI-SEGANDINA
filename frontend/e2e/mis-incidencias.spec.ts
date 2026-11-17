// RF-04 "Mis incidencias" desde el celular (360 × 740). El Vigilante registra una incidencia y la ve en
// /incidencias/mias. El registro (`POST /api/incidencias`) y la consulta (`GET /api/incidencias/mias`) se simulan
// con `page.route`, igual que la zona asignada, para no escribir en la base: la consulta devuelve justo lo
// registrado. Que la API solo devuelva las incidencias propias lo prueban el backend (CP-126) y Newman.

import { expect, test, type Page } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, ocultarIndicadorNext, usarSesion } from "./ayudas";

capturarAlFallar();

const MOVIL = { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true };

const ZONA = {
  idZona: 9200,
  nombreZona: "Zona de prueba Mis incidencias",
  departamento: "Lima",
  provincia: "Lima",
  distrito: "Breña",
  referencia: null,
  descripcion: null,
  estadoActivo: true,
};

const DESCRIPCION = "Prueba simulada CP-128: puerta lateral abierta";

test.describe("Mis incidencias en el celular", () => {
  usarSesion("vigilante");
  test.use(MOVIL);

  test("CP-128 el Vigilante ve su incidencia recién registrada en Mis incidencias a 360 px", async ({ page }, testInfo) => {
    caso("CP-128");
    let nombreTipo = "";
    const consultas = await simular(page, () => nombreTipo);
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);

    await expect(page.locator("#idZona")).toContainText(ZONA.nombreZona);
    const tipo = page.getByRole("radiogroup", { name: "Tipo de evento" }).getByRole("radio").first();
    nombreTipo = (await tipo.innerText()).trim();
    await tipo.click();
    await page.getByRole("radiogroup", { name: "Nivel de gravedad" }).getByRole("radio").first().click();
    await page.locator("#descripcion").fill(DESCRIPCION);
    await page.getByRole("button", { name: "Registrar incidencia" }).click();

    const confirmacion = page.getByRole("status").filter({ hasText: /Incidencia N\.° \d+ registrada/ });
    await expect(confirmacion).toBeVisible();
    await confirmacion.getByRole("link", { name: "Ver mis incidencias" }).click();
    await esperarPantalla(page, /\/incidencias\/mias$/);
    await ocultarIndicadorNext(page);

    await expect(page.getByTestId("titulo-pantalla")).toHaveText("Mis incidencias");
    const barra = page.getByRole("navigation", { name: "Navegación inferior" });
    await expect(barra.getByRole("link", { name: "Mis incidencias", exact: true })).toHaveAttribute("aria-current", "page");

    // En el celular se ven tarjetas, no la tabla
    const lista = page.getByRole("list", { name: "Mis incidencias" });
    const primera = lista.getByRole("listitem").first();
    await expect(primera).toBeVisible();
    await expect(page.locator("table")).toBeHidden();
    await expect(primera).toContainText(ZONA.nombreZona);
    await expect(primera).toContainText(nombreTipo);
    expect(consultas.length, "consulta la API propia con el periodo por defecto").toBeGreaterThan(0);
    expect(consultas[0].searchParams.get("periodo")).toBe("ULTIMOS_30_DIAS");

    await primera.getByRole("button", { name: "Ver detalle" }).click();
    await expect(primera).toContainText(DESCRIPCION);
    await expect(primera).toContainText("Registrada en el sistema el");

    const anchos = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, ventana: window.innerWidth }));
    expect(anchos.documento, "sin desplazamiento horizontal").toBeLessThanOrEqual(anchos.ventana);
    await capturar(page, testInfo, "CP-128_mis_incidencias_360");
  });
});

/**
 * Simula la zona asignada, el registro y la consulta de "Mis incidencias" (que devuelve lo registrado, con el
 * nombre del tipo que se eligió en el formulario).
 *
 * @return las URL con que se consultó `GET /api/incidencias/mias`
 */
async function simular(page: Page, tipoElegido: () => string): Promise<URL[]> {
  const consultas: URL[] = [];
  let registrada: Record<string, unknown> | null = null;

  await page.route("**/api/catalogos/zonas", (ruta) => ruta.fulfill({ json: [ZONA] }));
  await page.route("**/api/auth/yo", async (ruta) => {
    const real = await ruta.fetch();
    await ruta.fulfill({ response: real, json: { ...(await real.json()), idZona: ZONA.idZona } });
  });
  await page.route("**/api/incidencias", async (ruta) => {
    if (ruta.request().method() !== "POST") return ruta.fallback();
    const enviado = ruta.request().postDataJSON();
    const ahora = new Date().toISOString();
    registrada = {
      idIncidencia: 999128,
      fechaHora: ahora,
      fechaRegistro: ahora,
      descripcion: enviado.descripcion,
      zona: ZONA,
      tipoEvento: { idTipoEvento: enviado.idTipoEvento, nombreTipoEvento: tipoElegido(), estadoActivo: true },
      nivelGravedad: { idNivelGravedad: enviado.idNivelGravedad, nombreNivel: "Nivel de prueba", orden: 1, estadoActivo: true },
    };
    await ruta.fulfill({ status: 201, json: { ...registrada, idUsuario: 0 } });
  });
  await page.route("**/api/incidencias/mias?**", async (ruta) => {
    consultas.push(new URL(ruta.request().url()));
    const contenido = registrada ? [{ ...registrada, editableHasta: null }] : [];
    await ruta.fulfill({
      json: { contenido, pagina: 0, tamano: 20, totalElementos: contenido.length, totalPaginas: contenido.length ? 1 : 0 },
    });
  });
  return consultas;
}
