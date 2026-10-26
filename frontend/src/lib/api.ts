// Cliente HTTP de la API. La URL base viene de NEXT_PUBLIC_API_URL (ver .env.example).

import axios, { AxiosError } from "axios";
import { borrarSesion, leerSesion, marcarCambioPendiente } from "./sesion";
import type { ErrorRespuesta } from "./tipos";

/** Mensaje del 403 que da la API cuando el token solo permite cambiar la contraseña temporal. */
const MENSAJE_CAMBIO_PENDIENTE = "Debe cambiar su contraseña antes de continuar";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Adjunta el JWT vigente a cada petición.
api.interceptors.request.use((config) => {
  const sesion = leerSesion();
  if (sesion) {
    config.headers.Authorization = `Bearer ${sesion.token}`;
  }
  return config;
});

// Un 401 con token significa token vencido o usuario dado de baja: se cierra la sesión y
// RutaProtegida lleva al login con el aviso. El 401 del login (credenciales malas) no trae token.
// Un 403 por contraseña temporal marca la sesión y RutaProtegida lleva a la pantalla de cambio.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error: AxiosError<ErrorRespuesta>) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      borrarSesion("expirada");
    } else if (error.response?.status === 403 && error.response.data?.mensaje === MENSAJE_CAMBIO_PENDIENTE) {
      marcarCambioPendiente();
    }
    return Promise.reject(error);
  },
);

export interface ErrorApi {
  status: number | null;
  mensaje: string;
  detalles: string[];
}

/** Traduce cualquier error de Axios a un mensaje legible para el usuario. */
export function errorDeApi(error: unknown): ErrorApi {
  if (axios.isAxiosError<ErrorRespuesta>(error)) {
    if (!error.response) {
      return { status: null, mensaje: "No se pudo conectar con el servidor. Revisa tu conexión.", detalles: [] };
    }
    const cuerpo = error.response.data;
    return {
      status: error.response.status,
      mensaje: cuerpo?.mensaje ?? "Ocurrió un error inesperado.",
      detalles: cuerpo?.detalles ?? [],
    };
  }
  return { status: null, mensaje: "Ocurrió un error inesperado.", detalles: [] };
}
