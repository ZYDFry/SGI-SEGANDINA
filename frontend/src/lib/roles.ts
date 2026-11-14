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

/** Íconos disponibles para el menú (se dibujan en `components/IconoMenu.tsx`). */
export type NombreIcono =
  | "dashboard"
  | "historial"
  | "auditoria"
  | "registrar"
  | "mis-incidencias"
  | "personal"
  | "catalogos"
  | "contrasena"
  | "cuenta"
  | "menu"
  | "cerrar"
  | "cerrar-sesion";

/** Grupos titulados del menú, en el orden en que se muestran. */
export const GRUPOS_MENU = ["Gestión", "Administración", "Mi cuenta"] as const;
export type GrupoMenu = (typeof GRUPOS_MENU)[number];

export interface OpcionMenu {
  href: string;
  etiqueta: string;
  roles: Rol[];
  grupo: GrupoMenu;
  icono: NombreIcono;
  /** Texto corto para la barra inferior del celular (si falta, se usa `etiqueta`). */
  etiquetaCorta?: string;
  /** `false` deja la opción preparada pero oculta hasta que exista su pantalla. */
  disponible?: boolean;
}

export const MENU: OpcionMenu[] = [
  { href: "/dashboard", etiqueta: "Dashboard", roles: ROLES_GERENCIA, grupo: "Gestión", icono: "dashboard" },
  { href: "/historial", etiqueta: "Historial", roles: ROLES_GERENCIA, grupo: "Gestión", icono: "historial" },
  {
    href: "/incidencias/nueva",
    etiqueta: "Registrar incidencia",
    etiquetaCorta: "Registrar",
    roles: ROLES_REGISTRO,
    grupo: "Gestión",
    icono: "registrar",
  },
  {
    href: "/mis-incidencias",
    etiqueta: "Mis incidencias",
    roles: ["Vigilante"],
    grupo: "Gestión",
    icono: "mis-incidencias",
    disponible: false,
  },
  { href: "/historial/auditoria", etiqueta: "Auditoría", roles: ROLES_ADMIN, grupo: "Administración", icono: "auditoria" },
  { href: "/personal", etiqueta: "Personal", roles: ROLES_ADMIN, grupo: "Administración", icono: "personal" },
  { href: "/catalogos", etiqueta: "Catálogos", roles: ROLES_ADMIN, grupo: "Administración", icono: "catalogos" },
  { href: RUTA_MI_CONTRASENA, etiqueta: "Cambiar mi contraseña", roles: ROLES_TODOS, grupo: "Mi cuenta", icono: "contrasena" },
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

/** Opciones del menú visibles para el rol (omite las preparadas con `disponible: false`). */
export function menuDe(rol: Rol): OpcionMenu[] {
  return MENU.filter((opcion) => opcion.roles.includes(rol) && opcion.disponible !== false);
}

/**
 * Agrupa las opciones bajo sus títulos ("Gestión", "Administración", "Mi cuenta") en el orden de `GRUPOS_MENU`.
 *
 * @return los grupos con al menos una opción, cada uno con su título y sus opciones en el orden de `MENU`
 */
export function gruposDe(opciones: OpcionMenu[]): { titulo: GrupoMenu; opciones: OpcionMenu[] }[] {
  return GRUPOS_MENU.map((titulo) => ({ titulo, opciones: opciones.filter((o) => o.grupo === titulo) })).filter(
    (g) => g.opciones.length > 0,
  );
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
