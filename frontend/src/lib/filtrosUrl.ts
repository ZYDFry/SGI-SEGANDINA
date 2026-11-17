// Filtros comunes de incidencias (periodo, zona, tipo y gravedad) en la URL: leerlos, escribirlos y alternarlos
// desde los gráficos del dashboard. Lo usan el dashboard (RF-05) y el historial (RF-04).

import { PERIODO_INICIAL, PERIODOS } from "@/components/SelectorPeriodo";
import { parametrosIncidencias } from "./servicios";
import type { FiltroIncidencias, Periodo } from "./tipos";
import { validarRangoFechas } from "./validaciones";

/** Filtros comunes sin zona, gravedad ni tipo (últimos 30 días). */
export const FILTRO_INICIAL: FiltroIncidencias = {
  ...PERIODO_INICIAL,
  idZona: null,
  idNivelGravedad: null,
  idTipoEvento: null,
};

/** Filtros por catálogo que se eligen con un id (y que el dashboard aplica con un clic en su gráfico). */
export type ClaveDimension = "idZona" | "idTipoEvento" | "idNivelGravedad";

/**
 * Dimensiones filtrables, en el orden en que se muestran los chips. El nombre del parámetro de la URL es la misma
 * clave que el query param de la API. Un filtro nuevo (p. ej. estado actual) se suma aquí y en `FiltroIncidencias`.
 */
export const DIMENSIONES: readonly { clave: ClaveDimension; etiqueta: string }[] = [
  { clave: "idZona", etiqueta: "Zona" },
  { clave: "idTipoEvento", etiqueta: "Tipo de evento" },
  { clave: "idNivelGravedad", etiqueta: "Gravedad" },
];

const ID = /^[1-9]\d{0,9}$/;

function leerId(valor: string | null): number | null {
  return valor !== null && ID.test(valor) ? Number(valor) : null;
}

/**
 * Lee los filtros de la URL. Lo que no es válido se ignora y queda el valor por defecto: un periodo desconocido
 * vuelve a "Últimos 30 días", un rango personalizado incompleto o fuera de las reglas del backend (desde ≤ hasta,
 * máximo 366 días) también, y un id que no es un entero positivo no filtra.
 *
 * @param params query string actual (`useSearchParams()` o `new URLSearchParams(...)`)
 * @return filtros listos para enviar a la API
 */
export function filtroDesdeUrl(params: Pick<URLSearchParams, "get">): FiltroIncidencias {
  const filtro: FiltroIncidencias = { ...FILTRO_INICIAL };
  const periodo = params.get("periodo");
  if (periodo && PERIODOS.some((p) => p.valor === periodo)) {
    if (periodo === "PERSONALIZADO") {
      const desde = params.get("desde") ?? "";
      const hasta = params.get("hasta") ?? "";
      if (Object.keys(validarRangoFechas({ desde, hasta })).length === 0) {
        filtro.periodo = "PERSONALIZADO";
        filtro.desde = desde;
        filtro.hasta = hasta;
      }
    } else {
      filtro.periodo = periodo as Periodo;
    }
  }
  for (const { clave } of DIMENSIONES) filtro[clave] = leerId(params.get(clave));
  return filtro;
}

/**
 * Query string (sin "?") con los filtros que tienen valor, con los mismos nombres que la API. El periodo por
 * defecto no se escribe, así la URL sin filtros queda limpia.
 *
 * @param filtro filtros vigentes
 * @return por ejemplo `periodo=ULTIMOS_7_DIAS&idZona=3`, o cadena vacía sin filtros
 */
export function consultaDesdeFiltro(filtro: FiltroIncidencias): string {
  const params = parametrosIncidencias(filtro);
  if (params.periodo === FILTRO_INICIAL.periodo) delete params.periodo;
  return new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
}

/** El mismo filtro sin la dimensión indicada (lo que pide cada gráfico para no filtrarse a sí mismo). */
export function sinFiltro(filtro: FiltroIncidencias, clave: ClaveDimension): FiltroIncidencias {
  return filtro[clave] === null ? filtro : { ...filtro, [clave]: null };
}

/** Aplica el id en la dimensión o lo quita si ya era el elegido (clic en una barra, un sector o una tarjeta). */
export function alternarFiltro(filtro: FiltroIncidencias, clave: ClaveDimension, id: number): FiltroIncidencias {
  return { ...filtro, [clave]: filtro[clave] === id ? null : id };
}

/** Clave estable del filtro para comparar o usar como `key` (misma salida para filtros equivalentes). */
export function claveFiltro(filtro: FiltroIncidencias): string {
  return new URLSearchParams(
    Object.entries(parametrosIncidencias(filtro)).map(([k, v]) => [k, String(v)]),
  ).toString();
}
