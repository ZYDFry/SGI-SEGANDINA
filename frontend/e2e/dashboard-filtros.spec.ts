// RF-05 y RF-04: filtros globales del dashboard, filtrado cruzado, chips, filtros en la URL y "Ver en historial".
// Los catálogos, el dashboard y el historial se simulan con `page.route` y datos ficticios: los totales son fijos,
// no dependen de lo que haya en la base y se puede comprobar qué filtros envía cada gráfico. No escribe en la base.

import { expect, test, type Page, type Request } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, usarSesion } from "./ayudas";

capturarAlFallar();

const ZONAS = [
  { idZona: 9101, nombreZona: "Zona Norte E2E" },
  { idZona: 9102, nombreZona: "Zona Sur E2E" },
  { idZona: 9103, nombreZona: "Zona Centro E2E" },
];
const TIPOS = [
  { idTipoEvento: 9201, nombreTipoEvento: "Robo E2E" },
  { idTipoEvento: 9202, nombreTipoEvento: "Intrusión E2E" },
  { idTipoEvento: 9203, nombreTipoEvento: "Otro E2E" },
];
const NIVELES = [
  { idNivelGravedad: 9301, nombreNivel: "Baja E2E", orden: 1 },
  { idNivelGravedad: 9302, nombreNivel: "Media E2E", orden: 2 },
  { idNivelGravedad: 9303, nombreNivel: "Alta E2E", orden: 3 },
  { idNivelGravedad: 9304, nombreNivel: "Crítica E2E", orden: 4 },
];

/**
 * Incidencias ficticias por zona → tipo → cantidad por nivel (Baja, Media, Alta, Crítica). Total 30; "Robo E2E"
 * es más de la mitad en todas las zonas (su sector del anillo empieza arriba y pasa por las 3 en punto).
 */
const CONTEOS: Record<number, Record<number, [number, number, number, number]>> = {
  9101: { 9201: [5, 3, 2, 1], 9202: [2, 1, 1, 0], 9203: [1, 0, 0, 0] }, // 16
  9102: { 9201: [3, 2, 1, 1], 9202: [1, 1, 0, 0], 9203: [0, 1, 0, 0] }, // 10
  9103: { 9201: [2, 1, 0, 0], 9202: [0, 0, 1, 0], 9203: [0, 0, 0, 0] }, // 4
};

interface Grupo {
  idZona: number;
  idTipoEvento: number;
  idNivelGravedad: number;
  total: number;
}

const GRUPOS: Grupo[] = Object.entries(CONTEOS).flatMap(([zona, tipos]) =>
  Object.entries(tipos).flatMap(([tipo, porNivel]) =>
    porNivel.map((total, i) => ({
      idZona: Number(zona),
      idTipoEvento: Number(tipo),
      idNivelGravedad: NIVELES[i].idNivelGravedad,
      total,
    })),
  ),
);

/** Grupos que cumplen los filtros del query string (igual que el backend: AND de los que vienen). */
function filtrar(url: URL): Grupo[] {
  const id = (clave: string) => (url.searchParams.has(clave) ? Number(url.searchParams.get(clave)) : null);
  const [zona, tipo, nivel] = [id("idZona"), id("idTipoEvento"), id("idNivelGravedad")];
  return GRUPOS.filter(
    (g) =>
      (zona === null || g.idZona === zona) &&
      (tipo === null || g.idTipoEvento === tipo) &&
      (nivel === null || g.idNivelGravedad === nivel),
  );
}

const suma = (grupos: Grupo[]) => grupos.reduce((s, g) => s + g.total, 0);

function conteoPor<K extends "idZona" | "idTipoEvento">(grupos: Grupo[], clave: K, nombres: Map<number, string>) {
  const totales = new Map<number, number>();
  for (const g of grupos) totales.set(g[clave], (totales.get(g[clave]) ?? 0) + g.total);
  return [...totales]
    .filter(([, total]) => total > 0)
    .map(([id, total]) => ({ id, nombre: nombres.get(id)!, total }))
    .sort((a, b) => b.total - a.total);
}

const ZONA = (z: (typeof ZONAS)[number]) => ({
  ...z,
  departamento: "Lima",
  provincia: "Lima",
  distrito: "Distrito E2E",
  referencia: null,
  descripcion: null,
  estadoActivo: true,
});

/** Simula catálogos, dashboard e historial; devuelve las peticiones al dashboard para revisar sus filtros. */
async function simularApi(page: Page): Promise<Request[]> {
  const peticiones: Request[] = [];
  await page.route("**/api/catalogos/zonas", (r) => r.fulfill({ json: ZONAS.map(ZONA) }));
  await page.route("**/api/catalogos/tipos-evento", (r) =>
    r.fulfill({ json: TIPOS.map((t) => ({ ...t, estadoActivo: true })) }),
  );
  await page.route("**/api/catalogos/niveles-gravedad", (r) =>
    r.fulfill({ json: NIVELES.map((n) => ({ ...n, estadoActivo: true })) }),
  );
  await page.route("**/api/dashboard/**", (ruta) => {
    const url = new URL(ruta.request().url());
    peticiones.push(ruta.request());
    const grupos = filtrar(url);
    switch (url.pathname) {
      case "/api/dashboard/kpis":
        return ruta.fulfill({
          json: {
            desde: "2026-10-18",
            hasta: "2026-11-16",
            incidenciasHoy: Math.floor(suma(grupos) / 5),
            incidenciasPeriodo: suma(grupos),
            porGravedad: NIVELES.map((n) => ({
              ...n,
              total: suma(grupos.filter((g) => g.idNivelGravedad === n.idNivelGravedad)),
            })),
          },
        });
      case "/api/dashboard/incidencias-por-zona":
        return ruta.fulfill({ json: conteoPor(grupos, "idZona", new Map(ZONAS.map((z) => [z.idZona, z.nombreZona]))) });
      case "/api/dashboard/incidencias-por-tipo":
        return ruta.fulfill({
          json: conteoPor(grupos, "idTipoEvento", new Map(TIPOS.map((t) => [t.idTipoEvento, t.nombreTipoEvento]))),
        });
      case "/api/dashboard/incidencias-por-tiempo":
        return ruta.fulfill({
          json: {
            agrupacion: "SEMANA",
            desde: "2026-10-18",
            hasta: "2026-11-16",
            puntos: [
              { inicio: "2026-10-18", fin: "2026-10-31", total: Math.ceil(suma(grupos) / 2) },
              { inicio: "2026-11-01", fin: "2026-11-16", total: Math.floor(suma(grupos) / 2) },
            ],
          },
        });
      case "/api/dashboard/despliegue":
        return ruta.fulfill({ json: ZONAS.map((z, i) => ({ idZona: z.idZona, nombreZona: z.nombreZona, vigilantesActivos: i + 1 })) });
      default:
        return ruta.fallback();
    }
  });
  await page.route(
    (url) => url.pathname === "/api/incidencias",
    (ruta) => {
      if (ruta.request().method() !== "GET") return ruta.fallback();
      const url = new URL(ruta.request().url());
      peticiones.push(ruta.request());
      const grupos = filtrar(url).filter((g) => g.total > 0);
      const total = suma(grupos);
      const tamano = Number(url.searchParams.get("size") ?? 20);
      const contenido = grupos
        .flatMap((g) => Array.from({ length: g.total }, () => g))
        .slice(0, tamano)
        .map((g, i) => ({
          idIncidencia: 99000 + i,
          fechaHora: "2026-11-10T10:00:00-05:00",
          fechaRegistro: "2026-11-10T10:01:00-05:00",
          descripcion: "Incidencia ficticia de prueba E2E",
          zona: ZONA(ZONAS.find((z) => z.idZona === g.idZona)!),
          tipoEvento: { ...TIPOS.find((t) => t.idTipoEvento === g.idTipoEvento)!, estadoActivo: true },
          nivelGravedad: { ...NIVELES.find((n) => n.idNivelGravedad === g.idNivelGravedad)!, estadoActivo: true },
          usuario: { idUsuario: 9900, dni: "00000000", nombreCompleto: "Vigilante Ficticio E2E" },
        }));
      return ruta.fulfill({
        json: { contenido, pagina: 0, tamano, totalElementos: total, totalPaginas: Math.max(1, Math.ceil(total / tamano)) },
      });
    },
  );
  return peticiones;
}

/** Parámetros de la última petición a un endpoint del dashboard (o del historial). */
function ultimaPeticion(peticiones: Request[], ruta: string): URLSearchParams {
  const encontrada = peticiones.filter((p) => new URL(p.url()).pathname === ruta).at(-1);
  expect(encontrada, `se pidió ${ruta}`).toBeTruthy();
  return new URL(encontrada!.url()).searchParams;
}

/** Valor del KPI "Incidencias del periodo". */
function kpiPeriodo(page: Page) {
  return page.getByText("Incidencias del periodo", { exact: true }).locator("xpath=following-sibling::p[1]");
}

/** Total de un tipo en la tabla accesible del anillo. */
function filaAnillo(page: Page, tipo: string) {
  return page
    .locator("table", { has: page.locator("caption", { hasText: "Incidencias por tipo de evento" }) })
    .getByRole("row", { name: new RegExp(tipo) });
}

const chips = (page: Page) => page.getByRole("group", { name: "Filtros activos" });

/** Región aria-live que anuncia los filtros vigentes. */
const anuncio = (page: Page) => page.getByTestId("anuncio-filtros");

/** Tarjeta de un gráfico por su título. */
const tarjeta = (page: Page, titulo: string) => page.locator("section", { has: page.getByRole("heading", { name: titulo }) });

/**
 * Clic en el gráfico de barras por zona, en una fila (0 = la primera) y una parte: el inicio de la barra (justo a
 * la derecha de los nombres de zona) o el espacio en blanco del extremo derecho (más allá de las barras cortas).
 */
async function clicEnBarras(page: Page, fila: number, parte: "barra" | "vacio") {
  const lienzo = tarjeta(page, "Incidencias por zona").locator("canvas");
  await lienzo.scrollIntoViewIfNeeded();
  const caja = (await lienzo.boundingBox())!;
  const altoFila = (caja.height - 30) / ZONAS.length; // descuenta el eje X de abajo
  const y = caja.y + altoFila * (fila + 0.5);
  await page.mouse.click(parte === "barra" ? caja.x + 130 : caja.x + caja.width - 20, y);
}

/** Clic en el centro del anillo (el hueco): un espacio vacío. */
async function clicEnCentroDelAnillo(page: Page) {
  const lienzo = tarjeta(page, "Incidencias por tipo de evento").locator("canvas");
  await lienzo.scrollIntoViewIfNeeded();
  const caja = (await lienzo.boundingBox())!;
  const radio = (caja.height - 40) / 2; // descuenta la leyenda de abajo
  await page.mouse.click(caja.x + caja.width / 2, caja.y + radio);
}

/** Control visible por id (con cacheComponents, Next deja la ruta anterior oculta en el DOM). */
const visible = (page: Page, selector: string) => page.locator(selector).filter({ visible: true });

test.describe("Dashboard con filtros globales y filtrado cruzado (Supervisor)", () => {
  usarSesion("supervisor");

  test("CP-110 elegir una zona cambia el anillo y los KPI", async ({ page }, testInfo) => {
    caso("CP-110");
    const peticiones = await simularApi(page);
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);
    await expect(kpiPeriodo(page)).toHaveText("30");
    await expect(filaAnillo(page, "Robo E2E")).toContainText("21");

    await page.locator("#filtro-zona").selectOption({ label: "Zona Sur E2E" });
    await expect(page).toHaveURL(/[?&]idZona=9102(&|$)/);
    await expect(kpiPeriodo(page)).toHaveText("10");
    await expect(filaAnillo(page, "Robo E2E")).toContainText("7");
    await expect(chips(page).getByText("Zona: Zona Sur E2E")).toBeVisible();

    expect(ultimaPeticion(peticiones, "/api/dashboard/kpis").get("idZona")).toBe("9102");
    expect(ultimaPeticion(peticiones, "/api/dashboard/incidencias-por-tipo").get("idZona")).toBe("9102");
    expect(ultimaPeticion(peticiones, "/api/dashboard/incidencias-por-tiempo").get("idZona")).toBe("9102");
    expect(ultimaPeticion(peticiones, "/api/dashboard/incidencias-por-zona").has("idZona"), "las barras ignoran su filtro").toBe(false);
    // La barra de la zona elegida queda marcada en la alternativa con teclado
    await expect(page.getByRole("button", { name: "Filtrar por Zona Sur E2E" })).toHaveAttribute("aria-pressed", "true");
    await capturar(page, testInfo, "CP-110_dashboard_filtrado_por_zona", { paginaCompleta: true });
  });

  test("CP-111 clic en un sector del anillo filtra los demás y aparece el chip", async ({ page }, testInfo) => {
    caso("CP-111");
    const peticiones = await simularApi(page);
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);
    await expect(filaAnillo(page, "Robo E2E")).toContainText("21");

    // "Robo E2E" (70 %) va del extremo superior hasta pasadas las 7: se hace clic a las 3 en punto, dentro del aro.
    const lienzo = page.locator("section", { has: page.getByRole("heading", { name: "Incidencias por tipo de evento" }) }).locator("canvas");
    await lienzo.scrollIntoViewIfNeeded();
    const caja = (await lienzo.boundingBox())!;
    const radio = (caja.height - 40) / 2; // descuenta la leyenda de abajo
    await page.mouse.click(caja.x + caja.width / 2 + radio * 0.75, caja.y + radio);

    await expect(page).toHaveURL(/[?&]idTipoEvento=9201(&|$)/);
    await expect(chips(page).getByText("Tipo de evento: Robo E2E")).toBeVisible();
    await expect(kpiPeriodo(page)).toHaveText("21");
    expect(ultimaPeticion(peticiones, "/api/dashboard/kpis").get("idTipoEvento")).toBe("9201");
    expect(ultimaPeticion(peticiones, "/api/dashboard/incidencias-por-zona").get("idTipoEvento")).toBe("9201");
    expect(ultimaPeticion(peticiones, "/api/dashboard/incidencias-por-tipo").has("idTipoEvento"), "el anillo ignora su filtro").toBe(false);
    await expect(page.getByRole("button", { name: "Filtrar por Robo E2E" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#filtro-tipo")).toHaveValue("9201");
    await capturar(page, testInfo, "CP-111_dashboard_clic_en_sector", { paginaCompleta: true });

    // Tarjeta de gravedad: también filtra y se marca
    await page.getByRole("button", { name: /Gravedad Media E2E/ }).click();
    await expect(page).toHaveURL(/[?&]idNivelGravedad=9302(&|$)/);
    await expect(kpiPeriodo(page)).toHaveText("6");
    await expect(page.getByRole("button", { name: /Gravedad Media E2E/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("CP-112 quitar un chip, \"Quitar filtros\" y \"Mostrando todo\"", async ({ page }, testInfo) => {
    caso("CP-112");
    const peticiones = await simularApi(page);
    await page.goto("/dashboard?idZona=9102&idTipoEvento=9201");
    await esperarPantalla(page, /\/dashboard\?/);
    await expect(kpiPeriodo(page)).toHaveText("7");
    await expect(chips(page).getByText("Zona: Zona Sur E2E")).toBeVisible();
    await expect(page.getByText("Haz clic en un gráfico para filtrar. Quita los filtros con × o con Quitar filtros.")).toBeVisible();
    await capturar(page, testInfo, "CP-112_chips_activos");

    await page.getByRole("button", { name: "Quitar filtro Zona: Zona Sur E2E", exact: true }).click();
    await expect(page).not.toHaveURL(/idZona=/);
    await expect(chips(page).getByText("Zona: Zona Sur E2E")).toHaveCount(0);
    await expect(kpiPeriodo(page)).toHaveText("21");
    expect(ultimaPeticion(peticiones, "/api/dashboard/kpis").has("idZona")).toBe(false);
    await expect(anuncio(page)).toHaveText("Filtros activos: Tipo de evento: Robo E2E");

    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(chips(page).getByText("Mostrando todo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Quitar filtros" })).toHaveCount(0);
    await expect(anuncio(page)).toHaveText("Mostrando todo");
    await expect(kpiPeriodo(page)).toHaveText("30");
    await capturar(page, testInfo, "CP-112_sin_filtros");
  });

  test("CP-113 \"Ver en historial\" llega con los mismos filtros y el mismo total", async ({ page }, testInfo) => {
    caso("CP-113");
    const peticiones = await simularApi(page);
    await page.goto("/dashboard?periodo=ULTIMOS_7_DIAS&idZona=9101&idNivelGravedad=9301");
    await esperarPantalla(page, /\/dashboard\?/);
    await expect(kpiPeriodo(page)).toHaveText("8");

    await page.getByRole("link", { name: "Ver en historial" }).click();
    await esperarPantalla(page, /\/historial\?/);
    const params = new URL(page.url()).searchParams;
    expect(Object.fromEntries(params)).toEqual({ periodo: "ULTIMOS_7_DIAS", idZona: "9101", idNivelGravedad: "9301" });
    await expect(page.getByRole("radiogroup", { name: "Periodo" }).filter({ visible: true }).getByRole("radio", { name: "7 días" })).toHaveAttribute("aria-checked", "true");
    await expect(visible(page, "#filtro-zona")).toHaveValue("9101");
    await expect(visible(page, "#filtro-gravedad")).toHaveValue("9301");
    await expect(page.getByText(/^8 registros · Página 1 de 1$/)).toBeVisible();
    const historial = ultimaPeticion(peticiones, "/api/incidencias");
    expect([historial.get("periodo"), historial.get("idZona"), historial.get("idNivelGravedad")]).toEqual(["ULTIMOS_7_DIAS", "9101", "9301"]);
    await capturar(page, testInfo, "CP-113_historial_desde_dashboard", { paginaCompleta: true });

    // El historial también escribe sus filtros en la URL
    await visible(page, "#filtro-tipo").selectOption({ label: "Robo E2E" });
    await expect(page).toHaveURL(/[?&]idTipoEvento=9201(&|$)/);
    await expect(page.getByText(/^5 registros · Página 1 de 1$/)).toBeVisible();
  });

  test("CP-114 una URL compartida reproduce los filtros", async ({ page }, testInfo) => {
    caso("CP-114");
    const peticiones = await simularApi(page);
    await page.goto(
      "/dashboard?periodo=PERSONALIZADO&desde=2026-10-01&hasta=2026-10-31&idZona=9103&idNivelGravedad=9303&idTipoEvento=abc",
    );
    await esperarPantalla(page, /\/dashboard\?/);

    await expect(page.getByRole("radiogroup", { name: "Periodo" }).getByRole("radio", { name: "Personalizado" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Desde")).toHaveValue("2026-10-01");
    await expect(page.getByLabel("Hasta")).toHaveValue("2026-10-31");
    await expect(page.locator("#filtro-zona")).toHaveValue("9103");
    await expect(page.locator("#filtro-gravedad")).toHaveValue("9303");
    await expect(page.locator("#filtro-tipo"), "un id no válido se ignora").toHaveValue("");
    await expect(chips(page).getByText("Periodo: 01/10/2026 al 31/10/2026")).toBeVisible();
    await expect(chips(page).getByText("Zona: Zona Centro E2E")).toBeVisible();
    await expect(chips(page).getByText("Gravedad: Alta E2E")).toBeVisible();
    await expect(chips(page).getByText(/^Tipo de evento:/)).toHaveCount(0);
    await expect(kpiPeriodo(page)).toHaveText("1");
    await expect(page.getByRole("button", { name: /Gravedad Alta E2E/ })).toHaveAttribute("aria-pressed", "true");

    const kpis = ultimaPeticion(peticiones, "/api/dashboard/kpis");
    expect(Object.fromEntries(kpis)).toEqual({
      periodo: "PERSONALIZADO",
      desde: "2026-10-01",
      hasta: "2026-10-31",
      idZona: "9103",
      idNivelGravedad: "9303",
    });
    await capturar(page, testInfo, "CP-114_url_compartida", { paginaCompleta: true });
  });

  test("CP-115 clic en una barra filtra, el aviso \"Filtrado por\" y quitar con clic en un espacio vacío", async ({ page }, testInfo) => {
    caso("CP-115");
    const peticiones = await simularApi(page);
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);
    await expect(chips(page).getByText("Mostrando todo")).toBeVisible();
    await expect(filaAnillo(page, "Robo E2E")).toContainText("21");

    // Clic en la barra de "Zona Sur E2E" (segunda fila: las barras van de mayor a menor)
    await clicEnBarras(page, 1, "barra");
    await expect(page).toHaveURL(/[?&]idZona=9102(&|$)/);
    await expect(chips(page).getByText("Zona: Zona Sur E2E")).toBeVisible();
    await expect(anuncio(page)).toHaveText("Filtros activos: Zona: Zona Sur E2E");
    await expect(filaAnillo(page, "Robo E2E")).toContainText("7");
    const avisoAnillo = tarjeta(page, "Incidencias por tipo de evento").locator('[data-aviso="idZona"]');
    await expect(avisoAnillo).toHaveText("Filtrado por Zona: Zona Sur E2E · Ver todo");
    await expect(tarjeta(page, "Incidencias en el tiempo").locator('[data-aviso="idZona"]')).toBeVisible();
    await expect(tarjeta(page, "Incidencias por zona").locator("[data-aviso]"), "las barras no avisan su propio filtro").toHaveCount(0);
    await capturar(page, testInfo, "CP-115_aviso_filtrado_por", { paginaCompleta: true });

    // "Ver todo" quita ese filtro
    await avisoAnillo.getByRole("button", { name: "Ver todo: quitar filtro Zona: Zona Sur E2E" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(avisoAnillo).toHaveCount(0);
    await expect(filaAnillo(page, "Robo E2E")).toContainText("21");

    // Clic en el espacio en blanco junto a la barra más corta quita el filtro de zona
    await clicEnBarras(page, 1, "barra");
    await expect(page).toHaveURL(/[?&]idZona=9102(&|$)/);
    await clicEnBarras(page, 2, "vacio");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(kpiPeriodo(page)).toHaveText("30");
    expect(ultimaPeticion(peticiones, "/api/dashboard/kpis").has("idZona")).toBe(false);

    // Clic en el centro del anillo quita el filtro de tipo
    await page.goto("/dashboard?idTipoEvento=9201");
    await esperarPantalla(page, /\/dashboard\?/);
    await expect(kpiPeriodo(page)).toHaveText("21");
    await clicEnCentroDelAnillo(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(kpiPeriodo(page)).toHaveText("30");
  });

  test("CP-116 Escape y \"Atrás\" quitan y restauran los filtros; la barra de filtros queda fija", async ({ page }, testInfo) => {
    caso("CP-116");
    await simularApi(page);
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);
    await page.goto("/dashboard?idZona=9101&idNivelGravedad=9302");
    await esperarPantalla(page, /\/dashboard\?/);
    await expect(kpiPeriodo(page)).toHaveText("4");

    // Escape dentro de un selector no quita nada
    await page.locator("#filtro-tipo").focus();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/idZona=9101/);

    // La barra de filtros sigue a la vista al desplazar hasta la serie (pantalla grande)
    await page.getByRole("heading", { name: "Incidencias en el tiempo" }).scrollIntoViewIfNeeded();
    await expect(page.getByTestId("barra-filtros")).toBeInViewport();
    await expect(chips(page).getByText("Zona: Zona Norte E2E")).toBeInViewport();
    await capturar(page, testInfo, "CP-116_chips_fijos_al_desplazar");

    // Escape con el foco en el dashboard quita todos los filtros
    await page.getByRole("heading", { name: "Dashboard gerencial" }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(chips(page).getByText("Mostrando todo")).toBeVisible();
    await expect(anuncio(page)).toHaveText("Mostrando todo");
    await expect(kpiPeriodo(page)).toHaveText("30");

    // "Atrás" vuelve a los dos filtros
    await page.goBack();
    await expect(page).toHaveURL(/[?&]idZona=9101(&|$)/);
    await expect(page).toHaveURL(/[?&]idNivelGravedad=9302(&|$)/);
    await expect(chips(page).getByText("Zona: Zona Norte E2E")).toBeVisible();
    await expect(chips(page).getByText("Gravedad: Media E2E")).toBeVisible();
    await expect(kpiPeriodo(page)).toHaveText("4");
  });
});
