// Acceso por rol en el frontend. Solo decide qué se muestra y a dónde se redirige:
// la autorización real la hace la API en cada petición.

import type { MotivoCierre } from "./sesion";
import type { Rol, Usuario } from "./tipos";

/** Única pantalla disponible mientras el usuario tenga una contraseña temporal. */
export const RUTA_CAMBIO_CONTRASENA = "/cambiar-contrasena";

export const ROLES_REGISTRO: Rol[] = ["Vigilante", "Administrador"];
export const ROLES_GERENCIA: Rol[] = ["Administrador", "Supervisor"];

export interface OpcionMenu {
  href: string;
  etiqueta: string;
  roles: Rol[];
}

export const MENU: OpcionMenu[] = [
  { href: "/dashboard", etiqueta: "Dashboard", roles: ROLES_GERENCIA },
  { href: "/incidencias/nueva", etiqueta: "Registrar incidencia", roles: ROLES_REGISTRO },
];

/** Pantalla de inicio tras el login: el vigilante va al formulario; gerencia, al dashboard. */
export function rutaInicio(rol: Rol): string {
  return rol === "Vigilante" ? "/incidencias/nueva" : "/dashboard";
}

/** A dónde ir con sesión: a cambiar la contraseña si es temporal; si no, al inicio de su rol. */
export function destinoInicial(usuario: Usuario): string {
  return usuario.debeCambiarContrasena ? RUTA_CAMBIO_CONTRASENA : rutaInicio(usuario.rol);
}

/** Ruta del login con el aviso que corresponde al motivo del cierre de sesión. */
export function rutaLogin(motivo: MotivoCierre | null): string {
  if (motivo === "expirada") return "/login?motivo=expirada";
  if (motivo === "contrasena-cambiada") return "/login?motivo=contrasena-actualizada";
  return "/login";
}

export function menuDe(rol: Rol): OpcionMenu[] {
  return MENU.filter((opcion) => opcion.roles.includes(rol));
}
