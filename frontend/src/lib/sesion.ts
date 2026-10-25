// Almacén de la sesión (JWT + usuario) en localStorage.
//
// Se usa localStorage y no una cookie httpOnly porque el frontend y la API están en dominios distintos:
// la API espera el token en el header Authorization y una cookie del dominio de la API sería de terceros
// (Safari/iOS la bloquea). La sesión se borra al cerrar sesión, al vencer (expiraEn) y ante un 401.

import type { Usuario } from "./tipos";

const CLAVE = "sgi.sesion";

export interface Sesion {
  token: string;
  /** Instante ISO en que el token deja de ser válido. */
  expiraEn: string;
  usuario: Usuario;
}

/** Por qué se cerró la última sesión; el login lo usa para mostrar un aviso. */
export type MotivoCierre = "manual" | "expirada";

const oyentes = new Set<() => void>();
let ultimoMotivo: MotivoCierre | null = null;

function notificar() {
  oyentes.forEach((oyente) => oyente());
}

/** Suscripción para useSyncExternalStore; también escucha cambios hechos en otras pestañas. */
export function suscribirSesion(oyente: () => void): () => void {
  oyentes.add(oyente);
  window.addEventListener("storage", oyente);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", oyente);
  };
}

/** Texto guardado tal cual (sirve como snapshot estable para React). */
export function leerSesionCruda(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

/** Convierte el texto guardado en una sesión; devuelve null si falta o está corrupto. */
export function parsearSesion(cruda: string | null): Sesion | null {
  if (!cruda) return null;
  try {
    const sesion = JSON.parse(cruda) as Sesion;
    if (!sesion.token || !sesion.expiraEn || !sesion.usuario?.rol) return null;
    return sesion;
  } catch {
    return null;
  }
}

/** Sesión actual, o null si no hay o ya venció. */
export function leerSesion(): Sesion | null {
  const sesion = parsearSesion(leerSesionCruda());
  if (!sesion || Date.parse(sesion.expiraEn) <= Date.now()) return null;
  return sesion;
}

export function guardarSesion(sesion: Sesion) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // Sin almacenamiento (modo privado estricto): la sesión no persiste.
  }
  ultimoMotivo = null;
  notificar();
}

export function borrarSesion(motivo: MotivoCierre = "manual") {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
  ultimoMotivo = motivo;
  notificar();
}

/** Devuelve el motivo del último cierre y lo olvida (se muestra una sola vez). */
export function consumirMotivoCierre(): MotivoCierre | null {
  const motivo = ultimoMotivo;
  ultimoMotivo = null;
  return motivo;
}
