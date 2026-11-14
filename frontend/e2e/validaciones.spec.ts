// Validaciones de formularios con sesión: cambio de contraseña, registro de incidencias, personal y catálogos.
// Ninguna prueba de este archivo envía datos: se comprueba que con avisos no sale la petición.

import { expect, test } from "@playwright/test";
import { capturar, capturarAlFallar, caso, contarPeticionesApi, esperarPantalla, usarSesion } from "./ayudas";

capturarAlFallar();

const MSJ_LONGITUD = "La contraseña debe tener entre 8 y 72 caracteres";

test.describe("Cambiar mi contraseña (Administrador)", () => {
  usarSesion("admin");

  test.beforeEach(async ({ page }) => {
    await page.goto("/mi-contrasena");
    await esperarPantalla(page, /\/mi-contrasena$/);
  });

  test("CP-75 longitud de la contraseña nueva", async ({ page }, testInfo) => {
    caso("CP-75");
    const nueva = page.locator("#nueva");
    await nueva.fill("a".repeat(7));
    await page.locator("#confirmacion").focus();
    await expect(page.locator("#error-nueva")).toHaveText(MSJ_LONGITUD);
    await capturar(page, testInfo, "CP-75_contrasena_longitud");
    await nueva.fill("a".repeat(73));
    await expect(page.locator("#error-nueva")).toHaveText(MSJ_LONGITUD);
    for (const largo of [8, 17, 72]) {
      await nueva.fill("a".repeat(largo));
      await expect(page.locator("#error-nueva")).toHaveCount(0);
    }
  });

  test("CP-76 confirmación distinta y nueva igual a la actual", async ({ page }, testInfo) => {
    caso("CP-76");
    const peticiones = contarPeticionesApi(page, "PATCH");
    await page.locator("#actual").fill("aaaaaaaa");
    await page.locator("#nueva").fill("aaaaaaaa");
    await page.locator("#confirmacion").fill("bbbbbbbb");
    await page.locator("#actual").focus();
    await expect(page.locator("#error-confirmacion")).toHaveText("Las contraseñas no coinciden");
    await expect(page.locator("#error-nueva")).toHaveText("La nueva contraseña debe ser distinta de la actual");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click({ force: true });
    expect(peticiones()).toBe(0);
    await capturar(page, testInfo, "CP-76_confirmacion_distinta");
  });
});

test.describe("Registro de incidencias (Vigilante)", () => {
  usarSesion("vigilante");

  test.beforeEach(async ({ page }) => {
    await page.goto("/incidencias/nueva");
    await esperarPantalla(page, /\/incidencias\/nueva$/);
    await expect(page.getByRole("button", { name: "Registrar incidencia" })).toBeVisible();
  });

  test("CP-77 obligatorios vacíos: avisos y sin petición", async ({ page }, testInfo) => {
    caso("CP-77");
    const peticiones = contarPeticionesApi(page, "POST");
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    await expect(page.locator("#error-idTipo")).toHaveText("Elige un tipo de evento");
    await expect(page.locator("#error-idGravedad")).toHaveText("Elige un nivel de gravedad");
    await expect(page.locator("#error-descripcion")).toHaveText("Este campo es obligatorio");
    expect(peticiones()).toBe(0);
    await capturar(page, testInfo, "CP-77_obligatorios_incidencia", { paginaCompleta: true });
  });

  test("CP-78 descripción corta con el tipo Otro", async ({ page }, testInfo) => {
    caso("CP-78");
    await page.getByRole("radio", { name: "Otro", exact: true }).click();
    const descripcion = page.locator("#descripcion");
    await descripcion.fill("a".repeat(19));
    await descripcion.blur();
    await expect(page.locator("#error-descripcion")).toHaveText('Para el tipo "Otro" la descripción debe tener al menos 20 caracteres');
    await expect(page.getByText('Mínimo 20 caracteres para "Otro"')).toBeVisible();
    await capturar(page, testInfo, "CP-78_descripcion_otro_corta");
    await descripcion.fill("a".repeat(20));
    await expect(page.locator("#error-descripcion")).toHaveCount(0);
  });

  test("CP-79 fecha y hora futura", async ({ page }, testInfo) => {
    caso("CP-79");
    await page.getByRole("button", { name: "¿Ocurrió antes? Cambiar fecha y hora" }).click();
    const futura = new Date(Date.now() + 10 * 60_000);
    const dosDigitos = (n: number) => String(n).padStart(2, "0");
    const valor = `${futura.getFullYear()}-${dosDigitos(futura.getMonth() + 1)}-${dosDigitos(futura.getDate())}T${dosDigitos(futura.getHours())}:${dosDigitos(futura.getMinutes())}`;
    await page.locator("#fecha").fill(valor);
    await page.locator("#fecha").blur();
    await expect(page.locator("#error-fecha")).toHaveText("La fecha y hora no puede ser futura");
    await expect(page.getByRole("button", { name: "Registrar incidencia" })).toBeDisabled();
    await capturar(page, testInfo, "CP-79_fecha_futura");
  });
});

test.describe("Personal y catálogos (Administrador)", () => {
  usarSesion("admin");

  test("CP-74 nombres con números en Agregar personal", async ({ page }, testInfo) => {
    caso("CP-74");
    await page.goto("/personal");
    await esperarPantalla(page, /\/personal$/);
    await page.getByRole("button", { name: "+ Agregar personal" }).click();
    const dialogo = page.getByRole("dialog", { name: "Agregar personal" });
    const peticiones = contarPeticionesApi(page, "POST");
    await dialogo.locator("#nombres").fill("Luis2");
    await dialogo.locator("#apellidoPaterno").fill("Rojas3");
    await dialogo.locator("#apellidoMaterno").focus();
    await dialogo.locator("#apellidoMaterno").blur();
    await expect(dialogo.locator("#error-nombres")).toHaveText("Solo se permiten letras, espacios, apóstrofo y guion");
    await expect(dialogo.locator("#error-apellidoPaterno")).toHaveText("Solo se permiten letras, espacios, apóstrofo y guion");
    await expect(dialogo.locator("#error-apellidoMaterno")).toHaveCount(0);
    await dialogo.getByRole("button", { name: "Crear usuario" }).click({ force: true });
    expect(peticiones()).toBe(0);
    await capturar(page, testInfo, "CP-74_nombres_con_numeros");
  });

  test("CP-90 Vigilante sin zona asignada", async ({ page }, testInfo) => {
    caso("CP-90");
    await page.goto("/personal");
    await esperarPantalla(page, /\/personal$/);
    await page.getByRole("button", { name: "+ Agregar personal" }).click();
    const dialogo = page.getByRole("dialog", { name: "Agregar personal" });
    const peticiones = contarPeticionesApi(page, "POST");
    await dialogo.locator("#idRol").selectOption({ label: "Vigilante" });
    await dialogo.getByRole("button", { name: "Crear usuario" }).click({ timeout: 5_000 });
    await expect(dialogo.locator("#error-idZona")).toHaveText("El Vigilante debe tener una zona asignada");
    await expect(dialogo.getByText("Obligatoria para el Vigilante.")).toBeVisible();
    expect(peticiones()).toBe(0);
    await capturar(page, testInfo, "CP-90_vigilante_sin_zona");
    await dialogo.locator("#idRol").selectOption({ label: "Supervisor" });
    await expect(dialogo.locator("#error-idZona")).toHaveCount(0);
  });

  test("CP-96 formulario de zona: obligatorios y máximo de 80", async ({ page }, testInfo) => {
    caso("CP-96");
    await page.goto("/catalogos");
    await esperarPantalla(page, /\/catalogos$/);
    await page.getByRole("button", { name: "+ Nueva zona" }).click();
    const dialogo = page.getByRole("dialog", { name: "Nueva zona" });
    const peticiones = contarPeticionesApi(page, "POST");
    await dialogo.getByRole("button", { name: "Crear zona" }).click({ timeout: 5_000 });
    for (const campo of ["nombreZona", "departamento", "provincia", "distrito"]) {
      await expect(dialogo.locator(`#error-${campo}`)).toHaveText("Este campo es obligatorio");
    }
    await expect(dialogo.locator("#error-referencia")).toHaveCount(0);
    await expect(dialogo.locator("#error-descripcion")).toHaveCount(0);
    expect(peticiones()).toBe(0);
    await capturar(page, testInfo, "CP-96_validaciones_zona");
    await dialogo.locator("#nombreZona").fill("");
    await dialogo.locator("#nombreZona").pressSequentially("z".repeat(81));
    await expect(dialogo.locator("#nombreZona")).toHaveValue("z".repeat(80));
  });

  test("CP-99 formulario de tipo de evento: obligatorio y máximo de 30", async ({ page }, testInfo) => {
    caso("CP-99");
    await page.goto("/catalogos/tipos-evento");
    await esperarPantalla(page, /\/catalogos\/tipos-evento$/);
    await page.getByRole("button", { name: "+ Nuevo tipo" }).click();
    const dialogo = page.getByRole("dialog", { name: "Nuevo tipo de evento" });
    const peticiones = contarPeticionesApi(page, "POST");
    await dialogo.getByRole("button", { name: "Crear tipo" }).click({ timeout: 5_000 });
    await expect(dialogo.locator("#error-nombreTipoEvento")).toHaveText("Este campo es obligatorio");
    expect(peticiones()).toBe(0);
    await capturar(page, testInfo, "CP-99_validaciones_tipo_evento");
    await dialogo.locator("#nombreTipoEvento").pressSequentially("t".repeat(31));
    await expect(dialogo.locator("#nombreTipoEvento")).toHaveValue("t".repeat(30));
  });

  test("CP-101 orden inválido de un nivel de gravedad", async ({ page }, testInfo) => {
    caso("CP-101");
    await page.goto("/catalogos/niveles-gravedad");
    await esperarPantalla(page, /\/catalogos\/niveles-gravedad$/);
    await page.getByRole("button", { name: "Editar" }).first().click();
    const dialogo = page.getByRole("dialog", { name: "Editar nivel de gravedad" });
    const peticiones = contarPeticionesApi(page, "PUT");
    const orden = dialogo.locator("#orden");
    await orden.fill("0");
    await orden.blur();
    await expect(dialogo.locator("#error-orden")).toHaveText("El orden debe ser un número entero entre 1 y 32767");
    await capturar(page, testInfo, "CP-101_orden_niveles");
    await orden.fill("");
    await orden.blur();
    await expect(dialogo.locator("#error-orden")).toHaveText("Este campo es obligatorio");
    await dialogo.getByRole("button", { name: "Guardar" }).click({ force: true });
    expect(peticiones()).toBe(0);
  });
});
