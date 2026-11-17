// Tipos de los DTO que expone la API del backend (mismos nombres de campo que los records de Java).

export type Rol = "Administrador" | "Supervisor" | "Vigilante";

export interface Usuario {
  idUsuario: number;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  rol: Rol;
  idZona: number | null;
  /** true si tiene una contraseña temporal: solo puede cambiarla hasta volver a iniciar sesión. */
  debeCambiarContrasena: boolean;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEn: string;
  usuario: Usuario;
}

export interface Zona {
  idZona: number;
  nombreZona: string;
  departamento: string;
  provincia: string;
  distrito: string;
  referencia: string | null;
  descripcion: string | null;
  estadoActivo: boolean;
}

export interface TipoEvento {
  idTipoEvento: number;
  nombreTipoEvento: string;
  estadoActivo: boolean;
}

export interface NivelGravedad {
  idNivelGravedad: number;
  nombreNivel: string;
  /** 1 = menos grave; define el color del selector. */
  orden: number;
  estadoActivo: boolean;
}

export interface IncidenciaRequest {
  idZona: number;
  idTipoEvento: number;
  idNivelGravedad: number;
  descripcion: string;
  /** ISO 8601 con offset; si se omite, el backend usa la hora actual. */
  fechaHora?: string;
}

export interface IncidenciaResponse {
  idIncidencia: number;
  fechaHora: string;
  descripcion: string;
  zona: Zona;
  tipoEvento: TipoEvento;
  nivelGravedad: NivelGravedad;
  idUsuario: number;
}

/** Formato uniforme de error de la API. */
export interface ErrorRespuesta {
  timestamp: string;
  status: number;
  mensaje: string;
  detalles: string[];
}

// ---------------------------------------------------------------------------------------------------------------
// Consultas: historial, dashboard, reportes y auditoría (RF-04 a RF-08)

/** Periodos del filtro de fechas común (enum `Periodo` del backend). */
export type Periodo = "HOY" | "ULTIMOS_7_DIAS" | "ULTIMOS_30_DIAS" | "MES_ACTUAL" | "ANIO_ACTUAL" | "PERSONALIZADO";

/** Tamaño de cada tramo de la serie por tiempo. */
export type Agrupacion = "DIA" | "SEMANA" | "MES";

/** Rango de fechas: `desde` y `hasta` (AAAA-MM-DD) solo con `PERSONALIZADO`. */
export interface FiltroPeriodo {
  periodo: Periodo;
  desde?: string;
  hasta?: string;
}

/** Filtros comunes del historial, el dashboard y los reportes. `null` = sin filtro. */
export interface FiltroIncidencias extends FiltroPeriodo {
  idZona: number | null;
  idNivelGravedad: number | null;
  idTipoEvento: number | null;
}

/** Filtros de la consulta de auditoría. */
export interface FiltroAuditoria extends FiltroPeriodo {
  /** Valor de `GET /api/auditoria/acciones`; vacío = todas. */
  accion: string;
  /** DNI completo o sus primeros dígitos; vacío = sin filtro. */
  q: string;
}

/** Formato común de los listados paginados (`PaginaResponse`). */
export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface ConteoGravedad {
  idNivelGravedad: number;
  nombreNivel: string;
  orden: number;
  total: number;
}

export interface Kpis {
  desde: string;
  hasta: string;
  incidenciasHoy: number;
  incidenciasPeriodo: number;
  /** Periodo anterior: mismo largo, justo antes de `desde`. */
  desdeAnterior: string;
  hastaAnterior: string;
  incidenciasPeriodoAnterior: number;
  porGravedad: ConteoGravedad[];
}

/** Incidencias de una zona o de un tipo de evento. */
export interface Conteo {
  id: number;
  nombre: string;
  total: number;
}

export interface PuntoSerie {
  inicio: string;
  fin: string;
  total: number;
}

export interface SerieTiempo {
  agrupacion: Agrupacion;
  desde: string;
  hasta: string;
  puntos: PuntoSerie[];
}

export interface DespliegueZona {
  idZona: number;
  nombreZona: string;
  vigilantesActivos: number;
}

/** Carga de una zona (`GET /api/dashboard/carga-por-zona`, RF-07). */
export interface CargaZona {
  idZona: number;
  nombreZona: string;
  incidencias: number;
  vigilantesActivos: number;
  /** `null` si la zona no tiene vigilantes activos. */
  incidenciasPorVigilante: number | null;
}

/** Vigilante con su zona (`GET /api/dashboard/vigilantes`); sin DNI ni contraseña. */
export interface VigilanteZona {
  idUsuario: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  idZona: number | null;
  nombreZona: string | null;
  estadoActivo: boolean;
}

/** Usuario que registró una incidencia o realizó una acción (sin contraseña ni rol). */
export interface Registrador {
  idUsuario: number;
  dni: string;
  nombreCompleto: string;
}

export interface IncidenciaHistorial {
  idIncidencia: number;
  fechaHora: string;
  fechaRegistro: string;
  descripcion: string;
  zona: Zona;
  tipoEvento: TipoEvento;
  nivelGravedad: NivelGravedad;
  usuario: Registrador;
}

export interface AccionAuditoria {
  valor: string;
  etiqueta: string;
}

export interface RegistroAuditoria {
  idAuditoria: number;
  fechaHora: string;
  accion: string;
  accionEtiqueta: string;
  /** `null` si no se identificó al usuario (p. ej. DNI inexistente en un login fallido). */
  usuario: Registrador | null;
  dniIntentado: string | null;
  detalle: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------------------------------------------
// Gestión de personal y catálogos (RF-02 y RF-09), solo Administrador

/** Rol del selector del formulario de usuarios (`GET /api/catalogos/roles`). */
export interface RolCatalogo {
  idRol: number;
  nombreRol: Rol;
}

/** Usuario de la gestión de personal (`UsuarioResponse`); nunca trae la contraseña. */
export interface UsuarioGestion {
  idUsuario: number;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  idRol: number;
  rol: Rol;
  idZona: number | null;
  nombreZona: string | null;
  estadoActivo: boolean;
}

/** Cuerpo de `POST /api/usuarios` y `PUT /api/usuarios/{id}`; `contrasena: null` en la edición la conserva. */
export interface UsuarioRequest {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  contrasena: string | null;
  idRol: number;
  idZona: number | null;
}

/** Filtros del listado de personal. `null` o vacío = sin filtro. */
export interface FiltroUsuarios {
  q: string;
  idRol: number | null;
  idZona: number | null;
  activo: boolean | null;
}

/** Cuerpo de `POST /api/zonas` y `PUT /api/zonas/{id}`. */
export interface ZonaRequest {
  nombreZona: string;
  departamento: string;
  provincia: string;
  distrito: string;
  referencia: string | null;
  descripcion: string | null;
}

/** Filtros del listado de zonas: `nombre` contiene; departamento, provincia y distrito exactos; `q` en referencia o descripción. */
export interface FiltroZonas {
  nombre: string;
  departamento: string;
  provincia: string;
  distrito: string;
  activo: boolean | null;
  q: string;
}
