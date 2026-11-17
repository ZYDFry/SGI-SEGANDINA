// RF-05 y RF-07: carga por zona y comparación con el periodo anterior en el dashboard, filtro por una zona inactiva,
// pantalla de despliegue de una zona y reasignación de vigilantes.
// - CP-117, CP-118, CP-121 y CP-124 usan los datos reales en modo lectura (no escriben).
// - CP-119, CP-120, CP-122 y CP-125 simulan la API con `page.route` y datos ficticios: no dependen de la base ni
//   escriben en ella (la reasignación real se prueba en el backend y con Newman --reasignacion).

import { expect, test, type Page, type Request } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, ocultarIndicadorNext, usarSesion } from "./ayudas";

capturarAlFallar();

const ZONA = (idZona: number, nombreZona: string, estadoActivo = true) => ({
  idZona,
  nombreZona,
  departamento: "Lima",
  provincia: "Lima",
  distrito: "Distrito E2E",
  referencia: "Referencia ficticia E2E",
  descripcion: null,
  estadoActivo,
});

const ZONAS = [ZONA(9101, "Zona Norte E2E"), ZONA(9102, "Zona Sur E2E"), ZONA(9103, "Zona Centro E2E")];

interface Vigilante {
  idUsuario: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  idZona: number;
  nombreZona: string;
  estadoActivo: boolean;
}

const VIGILANTES: Vigilante[] = [
  { idUsuario: 9901, nombres: "Luis", apellidoPaterno: "Rojas", apellidoMaterno: "E2E", idZona: 9102, nombreZona: "Zona Sur E2E", estadoActivo: true },
  { idUsuario: 9902, nombres: "Ana", apellidoPaterno: "Pérez", apellidoMaterno: "E2E", idZona: 9102, nombreZona: "Zona Sur E2E", estadoActivo: false },
  { idUsuario: 9903, nombres: "Carlos", apellidoPaterno: "Soto", apellidoMaterno: "E2E", idZona: 9101, nombreZona: "Zona Norte E2E", estadoActivo: true },
];

/** Carga ficticia: la Zona Sur tiene 1 vigilante activo y 6 incidencias; la Centro, ninguno. */
const CARGA = [
  { idZona: 9103, nombreZona: "Zona Centro E2E", incidencias: 2, vigilantesActivos: 0, incidenciasPorVigilante: null },
  { idZona: 9102, nombreZona: "Zona Sur E2E", incidencias: 6, vigilantesActivos: 1, incidenciasPorVigilante: 6 },
  { idZona: 9101, nombreZona: "Zona Norte E2E", incidencias: 4, vigilantesActivos: 2, incidenciasPorVigilante: 2 },
];

/** Simula la API que usan el dashboard y la pantalla de zona; devuelve las peticiones hechas. */
async function simularApi(page: Page): Promise<Request[]> {
  const peticiones: Request[] = [];
  const vigilantes = VIGILANTES.map((v) => ({ ...v }));
  await page.route("**/api/catalogos/filtros", (r) =>
    r.fulfill({ json: { zonas: ZONAS, tiposEvento: [], nivelesGravedad: [] } }),
  );
  await page.route("**/api/catalogos/zonas", (r) => r.fulfill({ json: ZONAS }));
  await page.route(
    (url) => url.pathname.startsWith("/api/dashboard/") || url.pathname === "/api/incidencias",
    (ruta) => {
      const url = new URL(ruta.request().url());
      peticiones.push(ruta.request());
      const idZona = url.searchParams.get("idZona");
      if (url.pathname === "/api/dashboard/kpis") {
        return ruta.fulfill({
          json: {
            desde: "2026-11-10",
            hasta: "2026-11-16",
            incidenciasHoy: 1,
            incidenciasPeriodo: 12,
            desdeAnterior: "2026-11-03",
            hastaAnterior: "2026-11-09",
            incidenciasPeriodoAnterior: 8,
            porGravedad: [],
          },
        });
      }
      if (url.pathname === "/api/dashboard/carga-por-zona") {
        return ruta.fulfill({ json: idZona ? CARGA.filter((c) => c.idZona === Number(idZona)) : CARGA });
      }
      if (url.pathname === "/api/dashboard/despliegue") {
        return ruta.fulfill({ json: CARGA.map(({ idZona: id, nombreZona, vigilantesActivos }) => ({ idZona: id, nombreZona, vigilantesActivos })) });
      }
      if (url.pathname === "/api/dashboard/incidencias-por-tiempo") {
        return ruta.fulfill({ json: { agrupacion: "DIA", desde: "2026-11-10", hasta: "2026-11-16", puntos: [] } });
      }
      const zona = url.pathname.match(/^\/api\/dashboard\/zonas\/(\d+)$/);
      if (zona) {
        const encontrada = ZONAS.find((z) => z.idZona === Number(zona[1]));
        return encontrada
          ? ruta.fulfill({ json: encontrada })
          : ruta.fulfill({ status: 404, json: { timestamp: "", status: 404, mensaje: "La zona no existe", detalles: [] } });
      }
      if (url.pathname === "/api/dashboard/vigilantes") {
        const activo = url.searchParams.get("activo");
        return ruta.fulfill({
          json: vigilantes.filter(
            (v) => (!idZona || v.idZona === Number(idZona)) && (activo === null || String(v.estadoActivo) === activo),
          ),
        });
      }
      if (url.pathname === "/api/incidencias") {
        const contenido = Array.from({ length: 5 }, (_, i) => ({
          idIncidencia: 99100 + i,
          fechaHora: `2026-11-1${i}T10:00:00-05:00`,
          fechaRegistro: `2026-11-1${i}T10:01:00-05:00`,
          descripcion: "Incidencia ficticia de prueba E2E",
          zona: ZONAS[1],
          tipoEvento: { idTipoEvento: 9201, nombreTipoEvento: "Robo E2E", estadoActivo: true },
          nivelGravedad: { idNivelGravedad: 9302, nombreNivel: "Media E2E", orden: 2, estadoActivo: true },
          usuario: { idUsuario: 9901, dni: "00000000", nombreCompleto: "Vigilante Ficticio E2E" },
        }));
        return ruta.fulfill({ json: { contenido, pagina: 0, tamano: 5, totalElementos: 6, totalPaginas: 2 } });
      }
      // Barras y anillo del dashboard: sin datos
      return ruta.fulfill({ json: [] });
    },
  );
  await page.route(
    (url) => /^\/api\/usuarios\/\d+\/zona$/.test(url.pathname),
    (ruta) => {
      peticiones.push(ruta.request());
      const idUsuario = Number(new URL(ruta.request().url()).pathname.split("/")[3]);
      const { idZona } = ruta.request().postDataJSON() as { idZona: number };
      const vigilante = vigilantes.find((v) => v.idUsuario === idUsuario)!;
      const destino = ZONAS.find((z) => z.idZona === idZona)!;
      vigilante.idZona = destino.idZona;
      vigilante.nombreZona = destino.nombreZona;
      return ruta.fulfill({
        json: { ...vigilante, dni: "00000000", idRol: 3, rol: "Vigilante", nombreZona: destino.nombreZona },
      });
    },
  );
  return peticiones;
}

test.describe("Despliegue por zona y reasignación (Supervisor)", () => {
  usarSesion("supervisor");

  test("CP-120 pantalla de zona desde la tabla de carga del dashboard", async ({ page }, testInfo) => {
    caso("CP-120");
    await simularApi(page);
    await page.goto("/dashboard?periodo=ULTIMOS_7_DIAS");
    await esperarPantalla(page, /\/dashboard\?periodo=ULTIMOS_7_DIAS$/);

    // Comparación con el periodo anterior: 12 frente a 8 → ▲ 50 %
    await expect(page.locator("[data-comparacion]")).toHaveText("▲ 50 % vs. periodo anterior");

    // Tabla de carga: orden de la API y ordenable por encabezado
    const tabla = page.locator("#despliegue");
    const zonas = tabla.locator("tbody tr td:first-child");
    await expect(zonas).toHaveText(["Zona Centro E2E", "Zona Sur E2E", "Zona Norte E2E"]);
    await tabla.getByRole("button", { name: /^Zona/ }).click();
    await expect(zonas).toHaveText(["Zona Centro E2E", "Zona Norte E2E", "Zona Sur E2E"]);
    await expect(tabla.getByRole("columnheader", { name: /^Zona/ })).toHaveAttribute("aria-sort", "ascending");
    await expect(tabla.locator('tr[data-zona="9103"]')).toContainText("0 · Sin vigilantes");
    await capturar(page, testInfo, "CP-120_tabla_carga_por_zona", { paginaCompleta: true });

    // La zona enlaza a su pantalla con el periodo del dashboard
    await tabla.getByRole("link", { name: "Zona Sur E2E" }).click();
    await esperarPantalla(page, /\/despliegue\/9102\?periodo=ULTIMOS_7_DIAS$/);
    await expect(page.getByRole("heading", { name: "Zona Sur E2E" })).toBeVisible();
    await expect(page.getByTestId("titulo-pantalla")).toHaveText("Dashboard");
    await expect(page.getByText("Distrito E2E, Lima, Lima")).toBeVisible();

    // Vigilantes asignados con su estado; solo el activo se puede mover
    const lista = page.getByRole("list", { name: "Vigilantes de la zona" });
    await expect(lista.locator("li")).toHaveCount(2);
    await expect(lista.locator('li[data-vigilante="9901"]')).toContainText("Rojas E2E, Luis");
    await expect(lista.locator('li[data-vigilante="9901"]')).toContainText("Activo");
    await expect(lista.locator('li[data-vigilante="9902"]')).toContainText("Inactivo");
    await expect(lista.getByRole("button", { name: /Mover a otra zona/ })).toHaveCount(1);

    // Carga de la zona y sus incidencias recientes con enlace al historial filtrado por ella
    await expect(page.getByText("Incidencias por vigilante").locator("..")).toContainText("6");
    await expect(page.getByText("Mostrando 5 de 6. El resto, en el historial.")).toBeVisible();
    const enlace = page.getByRole("link", { name: "Ver en historial" });
    await expect(enlace).toHaveAttribute("href", "/historial?periodo=ULTIMOS_7_DIAS&idZona=9102");
    await capturar(page, testInfo, "CP-120_pantalla_zona", { paginaCompleta: true });
  });

  test("CP-122 el Supervisor mueve un vigilante a otra zona con confirmación", async ({ page }, testInfo) => {
    caso("CP-122");
    const peticiones = await simularApi(page);
    await page.goto("/despliegue/9102");
    await esperarPantalla(page, /\/despliegue\/9102$/);

    await page.getByRole("button", { name: "Mover a otra zona: Rojas E2E, Luis" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toContainText("Mover a otra zona");

    // Sin zona elegida: aviso debajo del campo y no se envía nada
    await dialogo.getByRole("button", { name: "Continuar" }).click();
    await expect(dialogo.locator("#error-idZona")).toHaveText("Elige una zona");

    // Solo ofrece zonas activas distintas de la actual
    await dialogo.locator("#idZona").click();
    const opciones = page.getByRole("listbox", { name: "Zona destino" }).getByRole("option");
    await expect(opciones).toHaveCount(2);
    await opciones.filter({ hasText: "Zona Norte E2E" }).click();
    await expect(dialogo.locator("#error-idZona")).toHaveCount(0);
    await dialogo.getByRole("button", { name: "Continuar" }).click();

    // Confirmación con el origen, el destino y el aviso sobre las incidencias pasadas
    const confirmacion = page.getByRole("dialog");
    await expect(confirmacion).toContainText("¿Mover a Rojas E2E, Luis de Zona Sur E2E a Zona Norte E2E?");
    await expect(confirmacion).toContainText("Sus incidencias ya registradas se quedan en Zona Sur E2E");
    await capturar(page, testInfo, "CP-122_confirmar_reasignacion");
    expect(peticiones.filter((p) => p.method() === "PATCH")).toHaveLength(0);
    await confirmacion.getByRole("button", { name: "Reasignar" }).click();

    // PATCH acotado con solo la zona nueva; la lista se actualiza
    await expect(page.getByText("Rojas E2E, Luis quedó asignado a Zona Norte E2E.")).toBeVisible();
    const patch = peticiones.filter((p) => p.method() === "PATCH");
    expect(patch).toHaveLength(1);
    expect(new URL(patch[0].url()).pathname).toBe("/api/usuarios/9901/zona");
    expect(patch[0].postDataJSON()).toEqual({ idZona: 9101 });
    await expect(page.getByRole("list", { name: "Vigilantes de la zona" }).locator('li[data-vigilante="9901"]')).toHaveCount(0);
    await capturar(page, testInfo, "CP-122_vigilante_reasignado");
  });
});

// ---------------------------------------------------------------------------------------------------------------
// CP-117 y CP-118 con los datos reales (solo lectura)

interface FilaCarga {
  idZona: number;
  nombreZona: string;
  incidencias: number;
  vigilantesActivos: number;
  incidenciasPorVigilante: number | null;
}

/** Misma regla que `lib/comparacion.ts`: texto esperado de la tarjeta "Incidencias del periodo". */
function textoComparacion(actual: number, anterior: number): string {
  if (anterior === 0) return actual === 0 ? "= 0 % vs. periodo anterior" : "▲ Sin incidencias en el periodo anterior";
  const porcentaje = Math.round(((actual - anterior) / anterior) * 100);
  if (porcentaje === 0) return "= 0 % vs. periodo anterior";
  return porcentaje > 0 ? `▲ ${porcentaje} % vs. periodo anterior` : `▼ ${Math.abs(porcentaje)} % vs. periodo anterior`;
}

test.describe("Carga por zona y periodo anterior con datos reales (Supervisor)", () => {
  usarSesion("supervisor");

  test("CP-117 la tabla de carga coincide con las incidencias por zona y se ordena", async ({ page }, testInfo) => {
    caso("CP-117");
    const carga = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/dashboard/carga-por-zona");
    const porZona = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/dashboard/incidencias-por-zona");
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);
    const respuestaCarga = await carga;
    expect(respuestaCarga.status()).toBe(200);
    const filas = (await respuestaCarga.json()) as FilaCarga[];
    const totales = new Map<number, number>(
      ((await (await porZona).json()) as { id: number; total: number }[]).map((c) => [c.id, c.total]),
    );

    // Mismos números que el gráfico de barras; sin vigilantes, "0 · Sin vigilantes" y "—"
    const tabla = page.locator("#despliegue");
    await expect(tabla.locator("tbody tr")).toHaveCount(filas.length);
    for (const fila of filas) {
      expect(fila.incidencias, `incidencias de ${fila.nombreZona}`).toBe(totales.get(fila.idZona) ?? 0);
      const celdas = tabla.locator(`tr[data-zona="${fila.idZona}"] td`);
      await expect(celdas.nth(2)).toHaveText(String(fila.incidencias));
      if (fila.vigilantesActivos === 0) {
        await expect(celdas.nth(1)).toHaveText("0 · Sin vigilantes");
        await expect(celdas.nth(3)).toHaveText("—");
      }
    }

    // Clic en "Incidencias": de mayor a menor
    await tabla.getByRole("button", { name: "Incidencias", exact: true }).click();
    await expect(tabla.getByRole("columnheader", { name: "Incidencias", exact: true })).toHaveAttribute("aria-sort", "descending");
    const valores = (await tabla.locator("tbody tr td:nth-child(3)").allTextContents()).map(Number);
    expect(valores).toEqual([...valores].sort((a, b) => b - a));
    await tabla.scrollIntoViewIfNeeded();
    await capturar(page, testInfo, "CP-117_carga_por_zona", { paginaCompleta: true });
  });

  test("CP-118 la comparación con el periodo anterior coincide con el historial", async ({ page }, testInfo) => {
    caso("CP-118");
    const kpis = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/dashboard/kpis" && r.url().includes("periodo=ULTIMOS_7_DIAS"),
    );
    await page.goto("/dashboard?periodo=ULTIMOS_7_DIAS");
    await esperarPantalla(page, /\/dashboard\?periodo=ULTIMOS_7_DIAS$/);
    const datos = (await (await kpis).json()) as {
      incidenciasPeriodo: number;
      incidenciasPeriodoAnterior: number;
      desdeAnterior: string;
      hastaAnterior: string;
    };
    await expect(page.locator("[data-comparacion]")).toHaveText(
      textoComparacion(datos.incidenciasPeriodo, datos.incidenciasPeriodoAnterior),
    );
    await capturar(page, testInfo, "CP-118_comparacion_periodo_anterior");

    // El historial del periodo anterior tiene el mismo total
    await page.goto(`/historial?periodo=PERSONALIZADO&desde=${datos.desdeAnterior}&hasta=${datos.hastaAnterior}`);
    await esperarPantalla(page, /\/historial\?/);
    if (datos.incidenciasPeriodoAnterior === 0) {
      await expect(page.getByText("No hay incidencias con estos filtros.")).toBeVisible();
    } else {
      const total = datos.incidenciasPeriodoAnterior;
      await expect(page.getByText(new RegExp(`^${total} registros? · Página`))).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// CP-119: filtro por una zona inactiva (catálogos e historial simulados)

const ZONA_INACTIVA = { ...ZONA(9109, "Zona Antigua E2E"), estadoActivo: false };

test.describe("Filtro por una zona inactiva (Supervisor)", () => {
  usarSesion("supervisor");

  test("CP-119 la zona inactiva aparece marcada al final y filtra el historial", async ({ page }, testInfo) => {
    caso("CP-119");
    await page.route("**/api/catalogos/filtros", (r) =>
      r.fulfill({
        json: {
          zonas: [ZONAS[0], ZONA_INACTIVA, ZONAS[1]],
          tiposEvento: [{ idTipoEvento: 9201, nombreTipoEvento: "Robo E2E", estadoActivo: true }],
          nivelesGravedad: [{ idNivelGravedad: 9302, nombreNivel: "Media E2E", orden: 2, estadoActivo: true }],
        },
      }),
    );
    const peticiones: Request[] = [];
    await page.route(
      (url) => url.pathname === "/api/incidencias",
      (ruta) => {
        peticiones.push(ruta.request());
        const idZona = new URL(ruta.request().url()).searchParams.get("idZona");
        const zona = idZona === String(ZONA_INACTIVA.idZona) ? ZONA_INACTIVA : ZONAS[0];
        const contenido = Array.from({ length: 3 }, (_, i) => ({
          idIncidencia: 99200 + i,
          fechaHora: `2026-0${i + 3}-15T10:00:00-05:00`,
          fechaRegistro: `2026-0${i + 3}-15T10:01:00-05:00`,
          descripcion: "Incidencia antigua ficticia de prueba E2E",
          zona,
          tipoEvento: { idTipoEvento: 9201, nombreTipoEvento: "Robo E2E", estadoActivo: true },
          nivelGravedad: { idNivelGravedad: 9302, nombreNivel: "Media E2E", orden: 2, estadoActivo: true },
          usuario: { idUsuario: 9901, dni: "00000000", nombreCompleto: "Vigilante Ficticio E2E" },
        }));
        return ruta.fulfill({ json: { contenido, pagina: 0, tamano: 20, totalElementos: 3, totalPaginas: 1 } });
      },
    );
    await page.goto("/historial?periodo=ANIO_ACTUAL");
    await esperarPantalla(page, /\/historial\?periodo=ANIO_ACTUAL$/);

    // Activas primero; la inactiva al final y marcada
    const opciones = page.locator("#filtro-zona option");
    await expect(opciones).toHaveText(["Todas las zonas", "Zona Norte E2E", "Zona Sur E2E", "Zona Antigua E2E (inactiva)"]);

    await page.locator("#filtro-zona").selectOption({ label: "Zona Antigua E2E (inactiva)" });
    await expect(page).toHaveURL(/idZona=9109/);
    await expect.poll(() => peticiones.at(-1) && new URL(peticiones.at(-1)!.url()).searchParams.get("idZona")).toBe("9109");
    await expect(page.locator("tbody tr").filter({ hasText: "Zona Antigua E2E" })).toHaveCount(3);
    await capturar(page, testInfo, "CP-119_filtro_zona_inactiva", { paginaCompleta: true });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// CP-121: auditoría de la reasignación (datos reales, solo lectura)

test.describe("Auditoría de la reasignación (Administrador)", () => {
  usarSesion("admin");

  test("CP-121 la auditoría muestra la reasignación con la zona anterior y la nueva", async ({ page }, testInfo) => {
    caso("CP-121");
    await page.goto("/historial/auditoria");
    await esperarPantalla(page, /\/historial\/auditoria$/);
    await expect(page.locator("#filtro-accion")).toBeEnabled();
    const consulta = page.waitForResponse((r) => r.url().includes("/api/auditoria?") && r.url().includes("accion=REASIGNAR_ZONA"));
    await page.locator("#filtro-accion").selectOption({ label: "Reasignar zona de vigilante" });
    const respuesta = await consulta;
    expect(respuesta.status()).toBe(200);
    const { totalElementos } = (await respuesta.json()) as { totalElementos: number };
    expect(totalElementos, "hace falta al menos una corrida previa de Newman con --reasignacion").toBeGreaterThan(0);

    // Cada fila: la acción y, en el detalle, la zona anterior tachada → la nueva
    const primera = page.locator("tbody tr").first();
    await expect(primera).toContainText("Reasignar zona de vigilante");
    await expect(primera).toContainText("→");
    await expect(primera).toContainText("Nombre:");
    await capturar(page, testInfo, "CP-121_reasignacion_admin", { paginaCompleta: true });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// CP-124 (datos reales) y CP-125 (registro simulado): el Vigilante

test.describe("El Vigilante y la reasignación", () => {
  usarSesion("vigilante");

  test("CP-124 el Vigilante no puede abrir la pantalla de una zona", async ({ page }, testInfo) => {
    caso("CP-124");
    await page.goto("/despliegue/1");
    await esperarPantalla(page, /\/incidencias\/nueva$/);
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
    await capturar(page, testInfo, "CP-124_vigilante_redirigido");
  });

  test.describe("en el celular", () => {
    test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

    test("CP-125 tras moverlo, el Vigilante registra en su zona nueva", async ({ page }, testInfo) => {
      caso("CP-125");
      const zonaNueva = ZONAS[0]; // Zona Norte E2E: la zona a la que el Supervisor lo movió
      await page.route("**/api/catalogos/zonas", (r) => r.fulfill({ json: ZONAS }));
      // El usuario real de la sesión, con la zona nueva (como queda tras PATCH /api/usuarios/{id}/zona)
      await page.route("**/api/auth/yo", async (ruta) => {
        const real = await ruta.fetch();
        await ruta.fulfill({ response: real, json: { ...(await real.json()), idZona: zonaNueva.idZona } });
      });
      // Registro simulado: responde con lo enviado y no escribe en la base
      await page.route("**/api/incidencias", async (ruta) => {
        if (ruta.request().method() !== "POST") return ruta.fallback();
        const enviado = ruta.request().postDataJSON();
        await ruta.fulfill({
          status: 201,
          json: {
            idIncidencia: 999125,
            fechaHora: new Date().toISOString(),
            descripcion: enviado.descripcion,
            zona: ZONAS.find((z) => z.idZona === enviado.idZona) ?? zonaNueva,
            tipoEvento: { idTipoEvento: enviado.idTipoEvento, nombreTipoEvento: "Tipo de prueba", estadoActivo: true },
            nivelGravedad: { idNivelGravedad: enviado.idNivelGravedad, nombreNivel: "Nivel de prueba", orden: 1, estadoActivo: true },
            idUsuario: 0,
          },
        });
      });

      await page.goto("/incidencias/nueva");
      await esperarPantalla(page, /\/incidencias\/nueva$/);
      await expect(page.locator("#titulo-zona")).toHaveText("Zona asignada");
      await expect(page.locator("#idZona")).toContainText("Zona Norte E2E");
      await page.getByRole("radiogroup", { name: "Tipo de evento" }).getByRole("radio").first().click();
      await page.getByRole("radiogroup", { name: "Nivel de gravedad" }).getByRole("radio").first().click();
      await page.locator("#descripcion").fill("Prueba simulada CP-125: no se guarda en la base de datos");

      const registro = page.waitForRequest((r) => r.url().endsWith("/api/incidencias") && r.method() === "POST");
      await ocultarIndicadorNext(page);
      await page.getByRole("button", { name: "Registrar incidencia" }).click();
      expect((await registro).postDataJSON().idZona, "la incidencia nueva va a la zona nueva").toBe(zonaNueva.idZona);
      await expect(page.getByRole("status").filter({ hasText: "Incidencia N.° 999125 registrada" })).toBeVisible();
      await capturar(page, testInfo, "CP-125_incidencia_en_zona_nueva");
    });
  });
});
