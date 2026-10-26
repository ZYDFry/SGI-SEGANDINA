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
