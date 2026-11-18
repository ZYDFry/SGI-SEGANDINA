// RF-04 "Mis incidencias" desde el celular (360 × 740). El Vigilante registra una incidencia y la ve en
// /incidencias/mias. El registro (`POST /api/incidencias`) y la consulta (`GET /api/incidencias/mias`) se simulan
// con `page.route`, igual que la zona asignada, para no escribir en la base: la consulta devuelve justo lo
// registrado. Que la API solo devuelva las incidencias propias lo prueban el backend (CP-126) y Newman.
//
// CP-132 (corrección por el autor, RF-03): el Administrador corrige una incidencia propia desde el modal, ve el
// cambio en la auditoría y, al avanzar el reloj del navegador más allá de `editableHasta`, el botón "Corregir"
// desaparece. La corrección (`PUT`) y la auditoría también se simulan; las reglas del plazo y del autor las prueban
// el backend (CP-129 a CP-131) y Newman.

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

test.describe("Corrección de la incidencia propia", () => {
  usarSesion("admin");

  test("CP-132 el autor corrige su incidencia en el modal, la auditoría muestra el cambio y el botón desaparece al vencer el plazo", async ({ page }, testInfo) => {
    caso("CP-132");
    await page.clock.install();
    const simulacion = await simularCorreccion(page);

    await page.goto("/incidencias/mias");
    await esperarPantalla(page, /\/incidencias\/mias$/);
    const fila = page.locator("tbody tr").first();
    const corregir = fila.getByRole("button", { name: /^Corregir \(quedan \d{2}:\d{2}\)$/ });
    await expect(corregir).toBeVisible();
    await capturar(page, testInfo, "CP-132_boton_corregir");

    await corregir.click();
    const modal = page.getByRole("dialog", { name: `Corregir incidencia N.° ${ID_CORREGIDA}` });
    await expect(modal).toBeVisible();
    const descripcion = modal.locator("#descripcion");
    await expect(descripcion).toHaveValue(DESCRIPCION_ORIGINAL);
    // Mismas validaciones del registro: vacía muestra el aviso bajo el campo
    await descripcion.fill("");
    await descripcion.blur();
    await expect(modal.locator("#error-descripcion")).toBeVisible();
    await descripcion.fill(DESCRIPCION_CORREGIDA);
    await capturar(page, testInfo, "CP-132_modal_correccion");
    await modal.getByRole("button", { name: "Guardar corrección" }).click();

    await expect(modal).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: `Incidencia N.° ${ID_CORREGIDA} corregida` })).toBeVisible();
    expect(simulacion.enviado, "envía el PUT con los datos corregidos").toMatchObject({
      idZona: ZONA.idZona,
      idTipoEvento: TIPO.idTipoEvento,
      idNivelGravedad: NIVEL.idNivelGravedad,
      descripcion: DESCRIPCION_CORREGIDA,
    });
    expect(simulacion.enviado, "sin cambiar la fecha, no la envía (se conserva)").not.toHaveProperty("fechaHora");

    // La auditoría muestra la acción con el valor anterior tachado y el nuevo
    await page.goto("/historial/auditoria");
    await esperarPantalla(page, /\/historial\/auditoria$/);
    const registro = page.locator("tbody tr").filter({ hasText: "Corregir incidencia" }).first();
    await expect(registro).toBeVisible();
    await expect(registro).toContainText(new RegExp(`Incidencia \\(id\\):\\s*${ID_CORREGIDA}`));
    await expect(registro.locator(".line-through")).toHaveText(DESCRIPCION_ORIGINAL);
    await expect(registro).toContainText(DESCRIPCION_CORREGIDA);
    await capturar(page, testInfo, "CP-132_auditoria_antes_despues", { paginaCompleta: true });

    // Vencido el plazo, el botón desaparece sin recargar
    await page.goto("/incidencias/mias");
    await esperarPantalla(page, /\/incidencias\/mias$/);
    await expect(page.locator("tbody tr").first().getByRole("button", { name: /^Corregir/ })).toBeVisible();
    await page.clock.fastForward("16:00");
    await expect(page.locator("tbody tr").first().getByRole("button", { name: /^Corregir/ })).toHaveCount(0);
    await expect(page.locator("tbody tr").first().getByRole("button", { name: "Ver detalle" })).toBeVisible();
    await capturar(page, testInfo, "CP-132_plazo_vencido");
  });
});

const ID_CORREGIDA = 999132;
const DESCRIPCION_ORIGINAL = "Prueba simulada CP-132: puerta abierta";
const DESCRIPCION_CORREGIDA = "Prueba simulada CP-132: puerta lateral forzada";
const TIPO = { idTipoEvento: 9201, nombreTipoEvento: "Tipo de prueba CP-132", estadoActivo: true };
const NIVEL = { idNivelGravedad: 9201, nombreNivel: "Nivel de prueba", orden: 1, estadoActivo: true };

/**
 * Simula los catálogos del formulario, "Mis incidencias" con una incidencia propia recién registrada (con
 * `editableHasta` a 15 minutos del reloj del navegador), la corrección (`PUT`) y la consulta de auditoría con el
 * registro `EDITAR_INCIDENCIA` resultante.
 *
 * @return el cuerpo que envió el `PUT` (se llena al corregir)
 */
async function simularCorreccion(page: Page): Promise<{ enviado: Record<string, unknown> | null }> {
  const resultado: { enviado: Record<string, unknown> | null } = { enviado: null };
  const registro = new Date(await page.evaluate(() => Date.now()));
  const editableHasta = new Date(registro.getTime() + 15 * 60_000).toISOString();
  let incidencia = {
    idIncidencia: ID_CORREGIDA,
    fechaHora: registro.toISOString(),
    fechaRegistro: registro.toISOString(),
    descripcion: DESCRIPCION_ORIGINAL,
    zona: ZONA,
    tipoEvento: TIPO,
    nivelGravedad: NIVEL,
  };

  await page.route("**/api/catalogos/zonas", (ruta) => ruta.fulfill({ json: [ZONA] }));
  await page.route("**/api/catalogos/tipos-evento", (ruta) => ruta.fulfill({ json: [TIPO] }));
  await page.route("**/api/catalogos/niveles-gravedad", (ruta) => ruta.fulfill({ json: [NIVEL] }));
  await page.route("**/api/incidencias/mias?**", (ruta) =>
    ruta.fulfill({
      json: { contenido: [{ ...incidencia, editableHasta }], pagina: 0, tamano: 20, totalElementos: 1, totalPaginas: 1 },
    }),
  );
  await page.route(`**/api/incidencias/${ID_CORREGIDA}`, async (ruta) => {
    if (ruta.request().method() !== "PUT") return ruta.fallback();
    resultado.enviado = ruta.request().postDataJSON();
    incidencia = { ...incidencia, descripcion: String(resultado.enviado?.descripcion) };
    await ruta.fulfill({ json: { ...incidencia, idUsuario: 0 } });
  });
  await page.route("**/api/auditoria?**", (ruta) =>
    ruta.fulfill({
      json: {
        contenido: [
          {
            idAuditoria: 999132,
            fechaHora: new Date().toISOString(),
            accion: "EDITAR_INCIDENCIA",
            accionEtiqueta: "Corregir incidencia",
            usuario: { idUsuario: 0, dni: "00000000", nombreCompleto: "Usuario de prueba" },
            dniIntentado: null,
            detalle: {
              idIncidencia: ID_CORREGIDA,
              antes: { descripcion: DESCRIPCION_ORIGINAL },
              despues: { descripcion: DESCRIPCION_CORREGIDA },
            },
          },
        ],
        pagina: 0,
        tamano: 20,
        totalElementos: 1,
        totalPaginas: 1,
      },
    }),
  );
  return resultado;
}

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
