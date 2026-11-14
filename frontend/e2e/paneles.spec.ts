// Pantallas de gerencia: dashboard (RF-05, RF-07), historial y exportación (RF-04, RF-06), auditoría (RF-08),
// personal (RF-02) y catálogos (RF-09). Solo consultan: no crean ni modifican registros.

import { expect, test } from "@playwright/test";
import { capturar, capturarAlFallar, caso, esperarPantalla, usarSesion } from "./ayudas";

capturarAlFallar();

test.describe("Dashboard e historial (Supervisor)", () => {
  usarSesion("supervisor");

  test("CP-45 dashboard con KPIs, gráficos y despliegue", async ({ page }, testInfo) => {
    caso("CP-45");
    await page.goto("/dashboard");
    await esperarPantalla(page, /\/dashboard$/);
    for (const texto of ["Incidencias de hoy", "Incidencias del periodo", "Vigilantes desplegados", "Incidencias por zona", "Incidencias por tipo de evento", "Incidencias en el tiempo", "Despliegue de vigilantes por zona"]) {
      await expect(page.getByText(texto, { exact: true }).first()).toBeVisible();
    }
    await expect(page.locator("canvas").first()).toBeVisible();
    await capturar(page, testInfo, "CP-45_dashboard_30_dias", { paginaCompleta: true });

    // Cambio de periodo: se piden de nuevo los datos con el periodo elegido
    const kpis = page.waitForResponse((r) => r.url().includes("/api/dashboard/kpis") && r.url().includes("periodo=ULTIMOS_7_DIAS"));
    await page.getByRole("radiogroup", { name: "Periodo" }).getByRole("radio", { name: "7 días" }).click();
    expect((await kpis).status()).toBe(200);

    // Agrupación y tipo de gráfico de la serie
    const serie = page.waitForResponse((r) => r.url().includes("/api/dashboard/incidencias-por-tiempo") && r.url().includes("agrupacion=SEMANA"));
    await page.getByRole("radiogroup", { name: "Agrupación" }).getByRole("radio", { name: "Semana" }).click();
    expect((await serie).status()).toBe(200);
    await page.getByRole("radiogroup", { name: "Tipo de gráfico" }).getByRole("radio", { name: "Barras" }).click();
    await capturar(page, testInfo, "CP-45_dashboard_7_dias_semana_barras", { paginaCompleta: true });
  });

  test("CP-38 historial con filtros y detalle", async ({ page }, testInfo) => {
    caso("CP-38");
    await page.goto("/historial");
    await esperarPantalla(page, /\/historial$/);
    for (const columna of ["Fecha", "Zona", "Tipo", "Gravedad", "Usuario"]) {
      await expect(page.getByRole("columnheader", { name: columna, exact: true })).toBeVisible();
    }
    await capturar(page, testInfo, "CP-38_historial_30_dias", { paginaCompleta: true });

    const filtrada = page.waitForResponse((r) => r.url().includes("/api/incidencias?") && r.url().includes("periodo=ULTIMOS_7_DIAS"));
    await page.getByRole("radiogroup", { name: "Periodo" }).getByRole("radio", { name: "7 días" }).click();
    expect((await filtrada).status()).toBe(200);

    const detalle = page.getByRole("button", { name: "Ver detalle" }).first();
    if (await detalle.count()) {
      await detalle.click();
      await expect(page.getByRole("button", { name: "Ocultar" }).first()).toBeVisible();
    } else {
      await expect(page.getByText("No hay incidencias con estos filtros.")).toBeVisible();
    }
    await capturar(page, testInfo, "CP-38_historial_filtrado_detalle", { paginaCompleta: true });
  });

  test("CP-51 exportar Excel y PDF desde el historial", async ({ page }, testInfo) => {
    caso("CP-51");
    await page.goto("/historial");
    await esperarPantalla(page, /\/historial$/);
    await page.getByRole("radiogroup", { name: "Periodo" }).getByRole("radio", { name: "Mes actual" }).click();

    for (const [boton, extension] of [["Exportar Excel", "xlsx"], ["Exportar PDF", "pdf"]] as const) {
      const descarga = page.waitForEvent("download");
      await page.getByRole("button", { name: boton }).click();
      const archivo = await descarga;
      expect(archivo.suggestedFilename()).toMatch(new RegExp(`^incidencias_\\d{4}-\\d{2}-\\d{2}\\.${extension}$`));
      await expect(page.getByRole("status").filter({ hasText: `Se descargó ${archivo.suggestedFilename()} con los filtros vigentes.` })).toBeVisible();
    }
    await capturar(page, testInfo, "CP-51_exportar_desde_historial");
  });

  test("CP-63 el Supervisor no ve la pestaña de auditoría", async ({ page }, testInfo) => {
    caso("CP-63");
    await page.goto("/historial");
    await esperarPantalla(page, /\/historial$/);
    await expect(page.getByRole("link", { name: "Auditoría", exact: true })).toHaveCount(0);
    await capturar(page, testInfo, "CP-63_supervisor_sin_auditoria");
  });
});

test.describe("Auditoría, personal y catálogos (Administrador)", () => {
  usarSesion("admin");

  test("CP-63 pestaña de auditoría con filtro por acción y DNI", async ({ page }, testInfo) => {
    caso("CP-63");
    await page.goto("/historial/auditoria");
    await esperarPantalla(page, /\/historial\/auditoria$/);
    // La acción se aplica al elegirla (sin pulsar "Buscar")
    await expect(page.locator("#filtro-accion")).toBeEnabled();
    const consulta = page.waitForResponse((r) => r.url().includes("/api/auditoria?") && r.url().includes("accion=LOGIN_FALLIDO"));
    await page.locator("#filtro-accion").selectOption({ label: "Inicio de sesión fallido" });
    expect((await consulta).status()).toBe(200);
    const filas = page.locator("tbody tr");
    if (await filas.count()) await expect(filas.first()).toContainText("Inicio de sesión fallido");
    await capturar(page, testInfo, "CP-63_auditoria_login_fallido", { paginaCompleta: true });

    await page.locator("#q").fill("9999");
    const porDni = page.waitForResponse((r) => r.url().includes("/api/auditoria?") && r.url().includes("q=9999"));
    await page.getByRole("button", { name: "Buscar" }).click();
    expect((await porDni).status()).toBe(200);
    await capturar(page, testInfo, "CP-63_auditoria_dni", { paginaCompleta: true });
  });

  test("CP-25 personal: tabla y filtros", async ({ page }, testInfo) => {
    caso("CP-25");
    await page.goto("/personal");
    await esperarPantalla(page, /\/personal$/);
    for (const columna of ["Nombre", "DNI", "Rol", "Zona", "Estado"]) {
      await expect(page.getByRole("columnheader", { name: columna })).toBeVisible();
    }
    await capturar(page, testInfo, "CP-25_personal_listado", { paginaCompleta: true });

    await page.locator("#filtro-estado").selectOption({ label: "Activos" });
    const filtrada = page.waitForResponse((r) => r.url().includes("/api/usuarios?") && r.url().includes("activo=true"));
    await page.getByRole("button", { name: "Buscar" }).click();
    expect((await filtrada).status()).toBe(200);
    await capturar(page, testInfo, "CP-25_personal_filtrado_activos", { paginaCompleta: true });
  });

  test("CP-69 catálogos: zonas, tipos de evento y niveles de gravedad", async ({ page }, testInfo) => {
    caso("CP-69");
    await page.goto("/catalogos");
    await esperarPantalla(page, /\/catalogos$/);
    await expect(page.getByRole("button", { name: "+ Nueva zona" })).toBeVisible();
    await capturar(page, testInfo, "CP-69_catalogo_zonas", { paginaCompleta: true });

    await page.getByRole("link", { name: "Tipos de evento" }).click();
    await esperarPantalla(page, /\/catalogos\/tipos-evento$/);
    await expect(page.getByRole("button", { name: "+ Nuevo tipo" })).toBeVisible();
    await capturar(page, testInfo, "CP-69_catalogo_tipos_evento", { paginaCompleta: true });

    await page.getByRole("link", { name: "Niveles de gravedad" }).click();
    await esperarPantalla(page, /\/catalogos\/niveles-gravedad$/);
    await expect(page.getByRole("button", { name: "Editar" }).first()).toBeVisible();
    await capturar(page, testInfo, "CP-69_catalogo_niveles", { paginaCompleta: true });
  });
});
