// Llamadas a la API usadas por las pantallas.

import axios from "axios";
import { api } from "./api";
import { hoyLima } from "./fechas";
import { guardarSesion, leerSesion } from "./sesion";
import type {
  AccionAuditoria,
  Agrupacion,
  CargaZona,
  Conteo,
  DespliegueZona,
  FiltroAuditoria,
  FiltroUsuarios,
  FiltroZonas,
  FiltroIncidencias,
  FiltroPeriodo,
  IncidenciaHistorial,
  IncidenciaRequest,
  Kpis,
  MiIncidencia,
  Pagina,
  RolCatalogo,
  RegistroAuditoria,
  SerieTiempo,
  IncidenciaResponse,
  LoginResponse,
  NivelGravedad,
  TipoEvento,
  Usuario,
  UsuarioGestion,
  UsuarioRequest,
  VigilanteZona,
  Zona,
  ZonaRequest,
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

/**
 * Vuelve a leer el usuario autenticado (`GET /api/auth/yo`) y lo guarda en la sesión, conservando el token. Sirve
 * cuando un dato pudo cambiar desde el login, como la zona asignada al vigilante.
 */
export async function refrescarUsuario(): Promise<Usuario> {
  const { data } = await api.get<Usuario>("/api/auth/yo");
  const sesion = leerSesion();
  if (sesion) guardarSesion({ ...sesion, usuario: data });
  return data;
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

/** Respuesta de `GET /api/catalogos/filtros`: catálogos completos, con activos e inactivos. */
interface CatalogosFiltroResponse {
  zonas: Zona[];
  tiposEvento: TipoEvento[];
  nivelesGravedad: NivelGravedad[];
}

/** Marca en el nombre los registros dados de baja y los deja al final, conservando el orden del backend. */
function conInactivosAlFinal<T extends { estadoActivo: boolean }>(lista: T[], marcar: (item: T) => T): T[] {
  return [...lista.filter((i) => i.estadoActivo), ...lista.filter((i) => !i.estadoActivo).map(marcar)];
}

/**
 * Zonas, tipos y niveles para los filtros del historial y del dashboard, incluidos los inactivos (marcados
 * "(inactiva)" / "(inactivo)" y al final de cada lista), para poder consultar incidencias antiguas. Solo
 * Administrador y Supervisor.
 */
export async function cargarCatalogosFiltro(): Promise<Catalogos> {
  const { data } = await api.get<CatalogosFiltroResponse>("/api/catalogos/filtros");
  return {
    zonas: conInactivosAlFinal(data.zonas, (z) => ({ ...z, nombreZona: `${z.nombreZona} (inactiva)` })),
    tipos: conInactivosAlFinal(data.tiposEvento, (t) => ({ ...t, nombreTipoEvento: `${t.nombreTipoEvento} (inactivo)` })),
    niveles: conInactivosAlFinal(data.nivelesGravedad, (n) => ({ ...n, nombreNivel: `${n.nombreNivel} (inactivo)` })),
  };
}

export async function registrarIncidencia(incidencia: IncidenciaRequest): Promise<IncidenciaResponse> {
  const { data } = await api.post<IncidenciaResponse>("/api/incidencias", incidencia);
  return data;
}

/**
 * Corrige una incidencia propia dentro del plazo (RF-03). Sin `fechaHora`, el backend conserva la registrada.
 * Responde 400 si venció el plazo y 404 si la incidencia no es del usuario.
 */
export async function corregirIncidencia(idIncidencia: number, incidencia: IncidenciaRequest): Promise<IncidenciaResponse> {
  const { data } = await api.put<IncidenciaResponse>(`/api/incidencias/${idIncidencia}`, incidencia);
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

/** "Mis incidencias": las que registró el usuario de la sesión (el backend lo toma del token). */
export async function buscarMisIncidencias(
  periodo: FiltroPeriodo,
  page: number,
  size: number,
): Promise<Pagina<MiIncidencia>> {
  const { data } = await api.get<Pagina<MiIncidencia>>("/api/incidencias/mias", {
    params: { ...parametrosPeriodo(periodo), page, size },
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

/** Carga por zona con los filtros comunes (RF-07), de la más cargada a la menos cargada. */
export async function obtenerCargaPorZona(filtro: FiltroIncidencias): Promise<CargaZona[]> {
  const { data } = await api.get<CargaZona[]>("/api/dashboard/carga-por-zona", { params: parametrosIncidencias(filtro) });
  return data;
}

/** Datos de una zona (activa o no) para la pantalla de despliegue; 404 si no existe. */
export async function obtenerZonaDespliegue(idZona: number): Promise<Zona> {
  const { data } = await api.get<Zona>(`/api/dashboard/zonas/${idZona}`);
  return data;
}

/** Vigilantes con su zona; `idZona` y `activo` son opcionales. */
export async function listarVigilantes(filtro: { idZona?: number; activo?: boolean } = {}): Promise<VigilanteZona[]> {
  const { data } = await api.get<VigilanteZona[]>("/api/dashboard/vigilantes", { params: filtro });
  return data;
}

/** Mueve a un vigilante activo a otra zona activa (Administrador y Supervisor). */
export async function reasignarZonaVigilante(idUsuario: number, idZona: number): Promise<UsuarioGestion> {
  const { data } = await api.patch<UsuarioGestion>(`/api/usuarios/${idUsuario}/zona`, { idZona });
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

// ---------------------------------------------------------------------------------------------------------------
// Gestión de personal (RF-02)

export async function listarRoles(): Promise<RolCatalogo[]> {
  const { data } = await api.get<RolCatalogo[]>("/api/catalogos/roles");
  return data;
}

/** Zonas activas (las únicas que se pueden asignar a un usuario o elegir en un formulario). */
export async function listarZonasActivas(): Promise<Zona[]> {
  const { data } = await api.get<Zona[]>("/api/catalogos/zonas");
  return data;
}

export async function buscarUsuarios(filtro: FiltroUsuarios, page: number, size: number): Promise<Pagina<UsuarioGestion>> {
  const params: Parametros = { page, size };
  if (filtro.q.trim()) params.q = filtro.q.trim();
  if (filtro.idRol !== null) params.idRol = filtro.idRol;
  if (filtro.idZona !== null) params.idZona = filtro.idZona;
  if (filtro.activo !== null) params.activo = String(filtro.activo);
  const { data } = await api.get<Pagina<UsuarioGestion>>("/api/usuarios", { params });
  return data;
}

/** Crea un usuario; su contraseña queda como temporal (deberá cambiarla en su primer ingreso). 409 si el DNI existe. */
export async function crearUsuario(usuario: UsuarioRequest): Promise<UsuarioGestion> {
  const { data } = await api.post<UsuarioGestion>("/api/usuarios", usuario);
  return data;
}

/** Reemplaza los datos, el rol y la zona (reasignar = cambiar `idZona`). Con `contrasena: null` la conserva. */
export async function actualizarUsuario(idUsuario: number, usuario: UsuarioRequest): Promise<UsuarioGestion> {
  const { data } = await api.put<UsuarioGestion>(`/api/usuarios/${idUsuario}`, usuario);
  return data;
}

/** Activa o da de baja (baja lógica). El backend rechaza con 400 que el Administrador se desactive a sí mismo. */
export async function cambiarEstadoUsuario(idUsuario: number, activo: boolean): Promise<UsuarioGestion> {
  const { data } = await api.patch<UsuarioGestion>(`/api/usuarios/${idUsuario}/estado`, { activo });
  return data;
}

/**
 * El Administrador asigna una contraseña temporal a otro usuario (204). No sirve para la propia cuenta (400):
 * para eso está `cambiarContrasenaPropia`.
 */
export async function restablecerContrasena(idUsuario: number, contrasenaNueva: string): Promise<void> {
  await api.patch(`/api/usuarios/${idUsuario}/contrasena`, { contrasenaNueva });
}

/** Vigilantes activos asignados a una zona (usa `totalElementos` de una página de tamaño 1). */
export async function contarVigilantesActivos(idZona: number, idRolVigilante: number): Promise<number> {
  const pagina = await buscarUsuarios({ q: "", idRol: idRolVigilante, idZona, activo: true }, 0, 1);
  return pagina.totalElementos;
}

// ---------------------------------------------------------------------------------------------------------------
// Catálogos (RF-09)

/** Máximo de zonas que acepta el listado en una página; se usa para armar las opciones de los filtros. */
export const ZONAS_POR_PAGINA_MAX = 100;

export async function buscarZonas(filtro: FiltroZonas, page: number, size: number): Promise<Pagina<Zona>> {
  const params: Parametros = { page, size };
  for (const clave of ["nombre", "departamento", "provincia", "distrito", "q"] as const) {
    const valor = filtro[clave].trim();
    if (valor) params[clave] = valor;
  }
  if (filtro.activo !== null) params.activo = String(filtro.activo);
  const { data } = await api.get<Pagina<Zona>>("/api/zonas", { params });
  return data;
}

export async function crearZona(zona: ZonaRequest): Promise<Zona> {
  const { data } = await api.post<Zona>("/api/zonas", zona);
  return data;
}

export async function actualizarZona(idZona: number, zona: ZonaRequest): Promise<Zona> {
  const { data } = await api.put<Zona>(`/api/zonas/${idZona}`, zona);
  return data;
}

export async function cambiarEstadoZona(idZona: number, activo: boolean): Promise<Zona> {
  const { data } = await api.patch<Zona>(`/api/zonas/${idZona}/estado`, { activo });
  return data;
}

/** Todos los tipos de evento, activos o no, por nombre. */
export async function listarTiposEvento(): Promise<TipoEvento[]> {
  const { data } = await api.get<TipoEvento[]>("/api/tipos-evento");
  return data;
}

export async function crearTipoEvento(nombreTipoEvento: string): Promise<TipoEvento> {
  const { data } = await api.post<TipoEvento>("/api/tipos-evento", { nombreTipoEvento });
  return data;
}

/** Renombra un tipo; el backend rechaza renombrar "Otro" (400) y los nombres repetidos (409). */
export async function actualizarTipoEvento(idTipoEvento: number, nombreTipoEvento: string): Promise<TipoEvento> {
  const { data } = await api.put<TipoEvento>(`/api/tipos-evento/${idTipoEvento}`, { nombreTipoEvento });
  return data;
}

export async function cambiarEstadoTipoEvento(idTipoEvento: number, activo: boolean): Promise<TipoEvento> {
  const { data } = await api.patch<TipoEvento>(`/api/tipos-evento/${idTipoEvento}/estado`, { activo });
  return data;
}

/** Todos los niveles de gravedad, de menos a más grave. */
export async function listarNiveles(): Promise<NivelGravedad[]> {
  const { data } = await api.get<NivelGravedad[]>("/api/niveles-gravedad");
  return data;
}

/** Cambia nombre y orden; si otro nivel tenía ese orden, el backend los intercambia. */
export async function actualizarNivel(idNivelGravedad: number, nombreNivel: string, orden: number): Promise<NivelGravedad> {
  const { data } = await api.put<NivelGravedad>(`/api/niveles-gravedad/${idNivelGravedad}`, { nombreNivel, orden });
  return data;
}
