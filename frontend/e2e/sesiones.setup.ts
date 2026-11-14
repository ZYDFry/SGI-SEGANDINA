// Crea la sesión de cada rol iniciando sesión por la API y guardándola en localStorage (clave sgi.sesion),
// como hace el login del frontend. Así las demás pruebas no vuelven a escribir contraseñas en pantalla.
// Los archivos quedan en e2e/.auth (fuera de git).

import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import { API_URL, DIR_SESIONES, archivoSesion, credenciales, type RolPrueba } from "./ayudas";

const ROLES: RolPrueba[] = ["admin", "supervisor", "vigilante"];

for (const rol of ROLES) {
  setup(`sesión de ${rol}`, async ({ page, request }) => {
    const archivo = archivoSesion(rol);
    fs.rmSync(archivo, { force: true });
    const datos = credenciales(rol);
    setup.skip(!datos, `Faltan las variables E2E_* de ${rol}`);

    const respuesta = await request.post(`${API_URL}/api/auth/login`, { data: { dni: datos!.dni, contrasena: datos!.contrasena } });
    expect(respuesta.status(), `login de ${rol} por la API`).toBe(200);
    const { token, expiraEn, usuario } = await respuesta.json();
    expect(usuario.debeCambiarContrasena, `${rol} no debe tener contraseña temporal`).toBe(false);

    await page.goto("/login");
    await page.evaluate((sesion) => localStorage.setItem("sgi.sesion", JSON.stringify(sesion)), { token, expiraEn, usuario });
    fs.mkdirSync(DIR_SESIONES, { recursive: true });
    await page.context().storageState({ path: archivo });
  });
}
