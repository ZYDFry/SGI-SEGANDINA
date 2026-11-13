// Llamadas a la API usadas por las pantallas.

import axios from "axios";
import { api } from "./api";
import { hoyLima } from "./fechas";
import { guardarSesion } from "./sesion";
import type {
  AccionAuditoria,
  Agrupacion,
  Conteo,
  DespliegueZona,
  FiltroAuditoria,
  FiltroIncidencias,
  FiltroPeriodo,
  IncidenciaHistorial,
  IncidenciaRequest,
  Kpis,
  Pagina,
  RegistroAuditoria,
  SerieTiempo,
  IncidenciaResponse,
  LoginResponse,
  NivelGravedad,
  TipoEvento,
  Usuario,
  Zona,
} from "./tipos";

/**
 * Cambia la contraseña del usuario autenticado (la actual puede ser la temporal). La API responde 204;
 * el token en uso sigue marcado, por eso quien llama debe cerrar la sesión y volver al login.
 */
export async function cambiarContrasenaPropia(contrasenaActual: string, contrasenaNueva: string): Promise<void> {
  await api.patch("/api/usuarios/me/contrasena", { contrasenaActual, contrasenaNueva });
}

/** Inicia sesión y guarda el token; devuelve el usuario autenticado. */
export async function iniciarSesion(dni: string, contrasena: string): Promise<Usuario> {
  const { data } = await api.post<LoginResponse>("/api/auth/login", { dni, contrasena });
  guardarSesion({ token: data.token, expiraEn: data.expiraEn, usuario: data.usuario });
  return data.usuario;
}

export interface Catalogos {
  zonas: Zona[];
  tipos: TipoEvento[];
  niveles: NivelGravedad[];
}

/** Zonas, tipos de evento y niveles de gravedad activos para el formulario de incidencias. */
export async function cargarCatalogos(): Promise<Catalogos> {
  const [zonas, tipos, niveles] = await Promise.all([
    api.get<Zona[]>("/api/catalogos/zonas"),
    api.get<TipoEvento[]>("/api/catalogos/tipos-evento"),
    api.get<NivelGravedad[]>("/api/catalogos/niveles-gravedad"),
  ]);
  return { zonas: zonas.data, tipos: tipos.data, niveles: niveles.data };
}

export async function registrarIncidencia(incidencia: IncidenciaRequest): Promise<IncidenciaResponse> {
  const { data } = await api.post<IncidenciaResponse>("/api/incidencias", incidencia);
  return data;
}

// ---------------------------------------------------------------------------------------------------------------
// Consultas con filtros: historial, dashboard, reportes y auditoría

type Parametros = Record<string, string | number>;

/** Query params del periodo: `desde` y `hasta` solo con PERSONALIZADO (el backend rechaza fechas con otro periodo). */
function parametrosPeriodo({ periodo, desde, hasta }: FiltroPeriodo): Parametros {
  const params: Parametros = { periodo };
  if (periodo === "PERSONALIZADO") {
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
  }
  return params;
}

/** Query params de los filtros comunes; los filtros sin valor no se envían. */
export function parametrosIncidencias(filtro: FiltroIncidencias): Parametros {
  const params = parametrosPeriodo(filtro);
  if (filtro.idZona !== null) params.idZona = filtro.idZona;
  if (filtro.idNivelGravedad !== null) params.idNivelGravedad = filtro.idNivelGravedad;
  if (filtro.idTipoEvento !== null) params.idTipoEvento = filtro.idTipoEvento;
  return params;
}

export async function buscarIncidencias(
  filtro: FiltroIncidencias,
  page: number,
  size: number,
): Promise<Pagina<IncidenciaHistorial>> {
  const { data } = await api.get<Pagina<IncidenciaHistorial>>("/api/incidencias", {
    params: { ...parametrosIncidencias(filtro), page, size },
  });
  return data;
}

export async function obtenerKpis(filtro: FiltroIncidencias): Promise<Kpis> {
  const { data } = await api.get<Kpis>("/api/dashboard/kpis", { params: parametrosIncidencias(filtro) });
  return data;
}

export async function obtenerPorZona(filtro: FiltroIncidencias): Promise<Conteo[]> {
  const { data } = await api.get<Conteo[]>("/api/dashboard/incidencias-por-zona", {
    params: parametrosIncidencias(filtro),
  });
  return data;
}

export async function obtenerPorTipo(filtro: FiltroIncidencias): Promise<Conteo[]> {
  const { data } = await api.get<Conteo[]>("/api/dashboard/incidencias-por-tipo", {
    params: parametrosIncidencias(filtro),
  });
  return data;
}

/** Serie por tiempo; sin `agrupacion`, el backend elige según el largo del rango. */
export async function obtenerSerieTiempo(
  filtro: FiltroIncidencias,
  agrupacion: Agrupacion | null,
): Promise<SerieTiempo> {
  const params = parametrosIncidencias(filtro);
  if (agrupacion) params.agrupacion = agrupacion;
  const { data } = await api.get<SerieTiempo>("/api/dashboard/incidencias-por-tiempo", { params });
  return data;
}

/** Vigilantes activos por zona activa (no usa filtros). */
export async function obtenerDespliegue(): Promise<DespliegueZona[]> {
  const { data } = await api.get<DespliegueZona[]>("/api/dashboard/despliegue");
  return data;
}

export type FormatoReporte = "excel" | "pdf";

const EXTENSION: Record<FormatoReporte, string> = { excel: "xlsx", pdf: "pdf" };

/** Nombre del archivo de `Content-Disposition` (`filename*=UTF-8''…` o `filename="…"`); `null` si no viene. */
export function nombreDeContentDisposition(cabecera: string | undefined | null): string | null {
  if (!cabecera) return null;
  const extendido = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(cabecera);
  if (extendido) return decodeURIComponent(extendido[1].trim().replace(/^"|"$/g, ""));
  const simple = /filename\s*=\s*"?([^";]+)"?/i.exec(cabecera);
  return simple ? simple[1].trim() : null;
}

/**
 * Descarga el historial filtrado en Excel o PDF con el nombre que da el backend en `Content-Disposition`.
 * Si la API responde un error, su cuerpo JSON llega como Blob: se convierte a objeto para que `errorDeApi`
 * muestre el mensaje del backend.
 *
 * @param formato excel o pdf
 * @param filtro  filtros vigentes del historial
 * @return el nombre del archivo descargado
 */
export async function exportarReporte(formato: FormatoReporte, filtro: FiltroIncidencias): Promise<string> {
  try {
    const respuesta = await api.get<Blob>(`/api/reportes/${formato}`, {
      params: parametrosIncidencias(filtro),
      responseType: "blob",
    });
    const nombre =
      nombreDeContentDisposition(respuesta.headers["content-disposition"] as string | undefined) ??
      `incidencias_${hoyLima()}.${EXTENSION[formato]}`;
    const url = URL.createObjectURL(respuesta.data);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Se libera después de que el navegador tome el archivo.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return nombre;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && error.response.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        error.response.data = null;
      }
    }
    throw error;
  }
}

export async function buscarAuditoria(
  filtro: FiltroAuditoria,
  page: number,
  size: number,
): Promise<Pagina<RegistroAuditoria>> {
  const params: Parametros = { ...parametrosPeriodo(filtro), page, size };
  if (filtro.accion) params.accion = filtro.accion;
  if (filtro.q.trim()) params.q = filtro.q.trim();
  const { data } = await api.get<Pagina<RegistroAuditoria>>("/api/auditoria", { params });
  return data;
}

export async function listarAccionesAuditoria(): Promise<AccionAuditoria[]> {
  const { data } = await api.get<AccionAuditoria[]>("/api/auditoria/acciones");
  return data;
}
