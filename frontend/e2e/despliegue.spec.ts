// RF-07: carga por zona en el dashboard, pantalla de despliegue de una zona y reasignación de vigilantes por el
// Supervisor. La API se simula con `page.route` y datos ficticios: no depende de la base ni escribe en ella (la
// reasignación real se prueba en el backend y en Postman con --completo).

import { expect, test, type Page, type Request } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, usarSesion } from "./ayudas";

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
