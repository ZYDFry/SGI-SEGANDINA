// Llamadas a la API usadas por las pantallas.

import { api } from "./api";
import { guardarSesion } from "./sesion";
import type {
  IncidenciaRequest,
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
