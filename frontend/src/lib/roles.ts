// Acceso por rol en el frontend. Solo decide qué se muestra y a dónde se redirige:
// la autorización real la hace la API en cada petición.

import type { Rol } from "./tipos";

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

export function menuDe(rol: Rol): OpcionMenu[] {
  return MENU.filter((opcion) => opcion.roles.includes(rol));
}
