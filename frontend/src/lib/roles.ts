// Acceso por rol en el frontend. Solo decide qué se muestra y a dónde se redirige:
// la autorización real la hace la API en cada petición.

import type { MotivoCierre } from "./sesion";
import type { Rol, Usuario } from "./tipos";

/** Única pantalla disponible mientras el usuario tenga una contraseña temporal. */
export const RUTA_CAMBIO_CONTRASENA = "/cambiar-contrasena";

export const ROLES_REGISTRO: Rol[] = ["Vigilante", "Administrador"];
export const ROLES_GERENCIA: Rol[] = ["Administrador", "Supervisor"];
export const ROLES_ADMIN: Rol[] = ["Administrador"];
export const ROLES_TODOS: Rol[] = ["Administrador", "Supervisor", "Vigilante"];

/** Cambio voluntario de la contraseña propia (cualquier rol, con sesión normal). */
export const RUTA_MI_CONTRASENA = "/mi-contrasena";

export interface OpcionMenu {
  href: string;
  etiqueta: string;
  roles: Rol[];
  /** Se muestra separada al pie del menú (opciones de la cuenta, no del trabajo). */
  cuenta?: boolean;
}

export const MENU: OpcionMenu[] = [
  { href: "/dashboard", etiqueta: "Dashboard", roles: ROLES_GERENCIA },
  { href: "/historial", etiqueta: "Historial", roles: ROLES_GERENCIA },
  { href: "/historial/auditoria", etiqueta: "Auditoría", roles: ROLES_ADMIN },
  { href: "/incidencias/nueva", etiqueta: "Registrar incidencia", roles: ROLES_REGISTRO },
  { href: "/personal", etiqueta: "Personal", roles: ROLES_ADMIN },
  { href: "/catalogos", etiqueta: "Catálogos", roles: ROLES_ADMIN },
  { href: RUTA_MI_CONTRASENA, etiqueta: "Cambiar mi contraseña", roles: ROLES_TODOS, cuenta: true },
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

/**
 * Opción del menú que corresponde a la ruta actual: la de prefijo más largo, para que `/catalogos/tipos-evento`
 * marque "Catálogos" y `/historial/auditoria` marque "Auditoría" y no "Historial".
 *
 * @return el `href` de la opción activa, o `null` si ninguna coincide
 */
export function opcionActiva(ruta: string, opciones: OpcionMenu[]): string | null {
  let mejor: string | null = null;
  for (const { href } of opciones) {
    const coincide = ruta === href || ruta.startsWith(`${href}/`);
    if (coincide && (mejor === null || href.length > mejor.length)) mejor = href;
  }
  return mejor;
}
