// Fechas para filtros y pantallas. Los días se cuentan en hora de Lima, igual que el backend.

import type { Agrupacion, PuntoSerie } from "./tipos";

export const ZONA_HORARIA = "America/Lima";

const FORMATO_DIA_ISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const FORMATO_HORA = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const FORMATO_MES = new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric", timeZone: "UTC" });

/** Hoy en Lima como AAAA-MM-DD (valor de un `<input type="date">`). */
export function hoyLima(ahora: Date = new Date()): string {
  return FORMATO_DIA_ISO.format(ahora);
}

/** Días entre dos fechas AAAA-MM-DD, contando ambas (2026-11-01 a 2026-11-01 = 1). */
export function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** Fecha y hora ISO de la API como "dd/mm/aaaa hh:mm" en hora de Lima. */
export function formatearFechaHora(iso: string): string {
  return FORMATO_FECHA_HORA.format(new Date(iso));
}

/** Hora "hh:mm:ss" en Lima (indicador de última actualización). */
export function formatearHora(fecha: Date): string {
  return FORMATO_HORA.format(fecha);
}

/** AAAA-MM-DD como "dd/mm/aaaa". */
export function formatearDia(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

/** Etiqueta del eje X de la serie: "05/11" (día), "05/11–11/11" (semana) o "nov. 2026" (mes). */
export function etiquetaTramo(punto: PuntoSerie, agrupacion: Agrupacion): string {
  const corto = (dia: string) => formatearDia(dia).slice(0, 5);
  if (agrupacion === "DIA") return corto(punto.inicio);
  if (agrupacion === "SEMANA") return `${corto(punto.inicio)}–${corto(punto.fin)}`;
  return FORMATO_MES.format(new Date(`${punto.inicio}T00:00:00Z`));
}
