/**
 * Reglas y mensajes de validación de los formularios. Los límites son los de los DTO del backend
 * (`LoginRequest`, `CambioContrasenaRequest`, `IncidenciaRequest`, `UsuarioCrearRequest`, `AuditoriaFiltro`), de
 * las reglas de sus servicios y del rango de fechas (`RangoFechas`); si cambian allá, se cambian aquí. Solo funciones puras: el estado de los avisos vive en
 * `useValidacion`.
 */
import type { ErrorApi } from "@/lib/api";
import { diasEntre } from "@/lib/fechas";

export const LARGO_DNI = 8;
export const CONTRASENA_MIN = 8;
export const CONTRASENA_MAX = 72;
export const NOMBRES_MAX = 80;
export const APELLIDO_MAX = 50;
export const DESCRIPCION_MAX = 2000;
export const DESCRIPCION_MIN_OTRO = 20;
/** Desfase de reloj que acepta el backend para la fecha de una incidencia (2 minutos). */
export const TOLERANCIA_FECHA_MS = 2 * 60 * 1000;
export const TIPO_OTRO = "Otro";
/** Máximo de días de un rango personalizado (`RangoFechas.MAX_DIAS`). */
export const RANGO_MAX_DIAS = 366;

export const MENSAJES = {
  obligatorio: "Este campo es obligatorio",
  dni: `El DNI debe tener ${LARGO_DNI} dígitos numéricos`,
  contrasenaLongitud: `La contraseña debe tener entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres`,
  contrasenaIgualActual: "La nueva contraseña debe ser distinta de la actual",
  contrasenasDistintas: "Las contraseñas no coinciden",
  nombreCaracteres: "Solo se permiten letras, espacios, apóstrofo y guion",
  maximo: (max: number) => `No debe superar los ${max} caracteres`,
  descripcionOtro: `Para el tipo "${TIPO_OTRO}" la descripción debe tener al menos ${DESCRIPCION_MIN_OTRO} caracteres`,
  fechaFutura: "La fecha y hora no puede ser futura",
  fechaInvalida: "La fecha y hora no es válida",
  zona: "Elige una zona",
  tipoEvento: "Elige un tipo de evento",
  nivelGravedad: "Elige un nivel de gravedad",
  fechaRangoObligatoria: "Elige una fecha",
  desdePosterior: "La fecha desde no puede ser posterior a hasta",
  rangoExcesivo: `El rango no puede superar ${RANGO_MAX_DIAS} días`,
  dniBusqueda: `El DNI debe tener solo dígitos, hasta ${LARGO_DNI}`,
} as const;

/** Mensaje de error por campo; un campo sin clave es válido. */
export type Errores<C extends string> = Partial<Record<C, string>>;

const SOLO_DIGITOS = /^\d+$/;
const DNI_VALIDO = new RegExp(`^\\d{${LARGO_DNI}}$`);
const DNI_BUSQUEDA = new RegExp(`^\\d{0,${LARGO_DNI}}$`);
const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;
// Letras (con tildes, ü y ñ), espacios, apóstrofo y guion.
const NOMBRE_VALIDO = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ' -]+$/;

/** Deja solo los dígitos del texto (escrito o pegado) y como máximo los 8 primeros. */
export function limpiarDni(texto: string): string {
  return texto.replace(/\D/g, "").slice(0, LARGO_DNI);
}

/** Indica si un texto que se va a insertar en el DNI son solo dígitos (para bloquear letras al escribir). */
export function sonDigitos(texto: string): boolean {
  return SOLO_DIGITOS.test(texto);
}

/** "Otro" sin distinguir mayúsculas ni espacios, igual que el backend. */
export function esTipoOtro(nombreTipo: string | undefined | null): boolean {
  return !!nombreTipo && nombreTipo.trim().toLowerCase() === TIPO_OTRO.toLowerCase();
}

export function obligatorio(valor: string): string | null {
  return valor.trim() ? null : MENSAJES.obligatorio;
}

export function validarDni(dni: string): string | null {
  const valor = dni.trim();
  if (!valor) return MENSAJES.obligatorio;
  return DNI_VALIDO.test(valor) ? null : MENSAJES.dni;
}

/** Contraseña del login: solo obligatoria (el backend no limita su longitud al iniciar sesión). */
export function validarContrasenaLogin(contrasena: string): string | null {
  return contrasena ? null : MENSAJES.obligatorio;
}

/** Contraseña nueva: de 8 a 72 caracteres y, si se conoce la actual, distinta de ella. No se recorta. */
export function validarContrasenaNueva(nueva: string, actual?: string): string | null {
  if (!nueva) return MENSAJES.obligatorio;
  if (nueva.length < CONTRASENA_MIN || nueva.length > CONTRASENA_MAX) return MENSAJES.contrasenaLongitud;
  if (actual && nueva === actual) return MENSAJES.contrasenaIgualActual;
  return null;
}

export function validarConfirmacion(confirmacion: string, nueva: string): string | null {
  if (!confirmacion) return MENSAJES.obligatorio;
  return confirmacion === nueva ? null : MENSAJES.contrasenasDistintas;
}

/**
 * Nombres y apellidos: solo letras, espacios, apóstrofo y guion, con largo máximo.
 *
 * @param valor    texto escrito (se evalúa recortado)
 * @param max      largo máximo del DTO (80 para nombres, 50 para apellidos)
 * @param opcional si el campo puede quedar vacío (apellido materno)
 */
export function validarNombre(valor: string, max: number, opcional = false): string | null {
  const texto = valor.trim();
  if (!texto) return opcional ? null : MENSAJES.obligatorio;
  if (texto.length > max) return MENSAJES.maximo(max);
  return NOMBRE_VALIDO.test(texto) ? null : MENSAJES.nombreCaracteres;
}

export function validarSeleccion(valor: number | null, mensaje: string): string | null {
  return valor === null ? mensaje : null;
}

/** Descripción de incidencia: obligatoria, máximo 2000 y mínimo 20 si el tipo es "Otro" (sobre el texto recortado). */
export function validarDescripcion(texto: string, esOtro: boolean): string | null {
  const valor = texto.trim();
  if (!valor) return MENSAJES.obligatorio;
  if (valor.length > DESCRIPCION_MAX) return MENSAJES.maximo(DESCRIPCION_MAX);
  if (esOtro && valor.length < DESCRIPCION_MIN_OTRO) return MENSAJES.descripcionOtro;
  return null;
}

/**
 * Fecha y hora de un `datetime-local`: obligatoria y no futura, con la misma tolerancia de 2 minutos del backend.
 *
 * @param valorLocal valor del input ("AAAA-MM-DDTHH:mm", hora del dispositivo)
 * @param ahora      instante de referencia en milisegundos (por defecto, ahora)
 */
export function validarFechaNoFutura(valorLocal: string, ahora: number = Date.now()): string | null {
  if (!valorLocal) return MENSAJES.obligatorio;
  const instante = new Date(valorLocal).getTime();
  if (Number.isNaN(instante)) return MENSAJES.fechaInvalida;
  return instante > ahora + TOLERANCIA_FECHA_MS ? MENSAJES.fechaFutura : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Validadores por formulario

export interface CamposLogin {
  dni: string;
  contrasena: string;
}

export function validarLogin({ dni, contrasena }: CamposLogin): Errores<keyof CamposLogin> {
  return sinNulos({ dni: validarDni(dni), contrasena: validarContrasenaLogin(contrasena) });
}

export interface CamposCambioContrasena {
  actual: string;
  nueva: string;
  confirmacion: string;
}

export function validarCambioContrasena({
  actual,
  nueva,
  confirmacion,
}: CamposCambioContrasena): Errores<keyof CamposCambioContrasena> {
  return sinNulos({
    actual: actual ? null : MENSAJES.obligatorio,
    nueva: validarContrasenaNueva(nueva, actual),
    confirmacion: validarConfirmacion(confirmacion, nueva),
  });
}

export interface CamposIncidencia {
  idZona: number | null;
  idTipo: number | null;
  idGravedad: number | null;
  descripcion: string;
  /** `null` cuando se usa la hora actual (fecha no editada). */
  fecha: string | null;
  esOtro: boolean;
}

export type CampoIncidencia = "idZona" | "idTipo" | "idGravedad" | "descripcion" | "fecha";

export function validarIncidencia(campos: CamposIncidencia, ahora?: number): Errores<CampoIncidencia> {
  return sinNulos({
    idZona: validarSeleccion(campos.idZona, MENSAJES.zona),
    idTipo: validarSeleccion(campos.idTipo, MENSAJES.tipoEvento),
    idGravedad: validarSeleccion(campos.idGravedad, MENSAJES.nivelGravedad),
    descripcion: validarDescripcion(campos.descripcion, campos.esOtro),
    fecha: campos.fecha === null ? null : validarFechaNoFutura(campos.fecha, ahora),
  });
}

export interface CamposRango {
  /** AAAA-MM-DD (valor de `<input type="date">`); vacío si no se eligió. */
  desde: string;
  hasta: string;
}

export type CampoRango = keyof CamposRango;

/**
 * Rango del periodo personalizado, con las mismas reglas que `RangoFechas` del backend: ambas fechas obligatorias,
 * `desde` no posterior a `hasta` (aviso en `desde`) y como máximo 366 días contando ambos extremos (aviso en `hasta`).
 */
export function validarRangoFechas({ desde, hasta }: CamposRango): Errores<CampoRango> {
  const errores: Errores<CampoRango> = {};
  if (!desde) errores.desde = MENSAJES.fechaRangoObligatoria;
  else if (!DIA_ISO.test(desde)) errores.desde = MENSAJES.fechaInvalida;
  if (!hasta) errores.hasta = MENSAJES.fechaRangoObligatoria;
  else if (!DIA_ISO.test(hasta)) errores.hasta = MENSAJES.fechaInvalida;
  if (errores.desde || errores.hasta) return errores;

  if (desde > hasta) {
    errores.desde = MENSAJES.desdePosterior;
  } else {
    if (diasEntre(desde, hasta) > RANGO_MAX_DIAS) errores.hasta = MENSAJES.rangoExcesivo;
  }
  return errores;
}

/** DNI del filtro de auditoría (`q`): opcional, solo dígitos y como máximo 8 (búsqueda por los primeros dígitos). */
export function validarDniBusqueda(q: string): string | null {
  return DNI_BUSQUEDA.test(q.trim()) ? null : MENSAJES.dniBusqueda;
}

// ---------------------------------------------------------------------------------------------------------------
// Errores del backend

/** Regla de negocio del backend (400 sin `detalles`) que se reconoce por su mensaje y se muestra bajo un campo. */
export interface ReglaServidor<C extends string> {
  contiene: string;
  campo: C;
  /** Texto a mostrar; por defecto, el mensaje del backend. */
  mensaje?: string;
}

export interface ErroresServidor<C extends string> {
  /** Avisos que van debajo de cada campo. */
  campos: Errores<C>;
  /** Lo que no corresponde a ningún campo (para la alerta general); `null` si todo se ubicó. */
  general: string | null;
}

/**
 * Reparte un error 400 del backend entre los campos del formulario.
 *
 * Cada detalle de Bean Validation llega como `"campo: mensaje"` (p. ej. `"descripcion: no debe superar los 2000
 * caracteres"`) y se coloca bajo el campo que indica `mapa`. Las reglas de negocio llegan solo en `mensaje` y se
 * ubican con `reglas`. Lo que no se pueda ubicar queda en `general`.
 *
 * @param error  error ya traducido por `errorDeApi`
 * @param mapa   nombre del campo en el backend → campo del formulario
 * @param reglas mensajes de regla de negocio conocidos → campo
 * @return avisos por campo y mensaje general restante
 */
export function erroresDelServidor<C extends string>(
  error: ErrorApi,
  mapa: Record<string, C>,
  reglas: ReglaServidor<C>[] = [],
): ErroresServidor<C> {
  const campos: Errores<C> = {};
  const sinUbicar: string[] = [];

  for (const detalle of error.detalles) {
    const separador = detalle.indexOf(":");
    const campo = separador > 0 ? mapa[detalle.slice(0, separador).trim()] : undefined;
    if (campo) {
      campos[campo] ??= conMayuscula(detalle.slice(separador + 1).trim());
    } else {
      sinUbicar.push(detalle);
    }
  }

  let general: string | null = error.mensaje;
  if (error.detalles.length > 0) {
    // "Datos de entrada inválidos": si todos los detalles se ubicaron, no hace falta la alerta general.
    general = sinUbicar.length > 0 ? `${error.mensaje}: ${sinUbicar.join("; ")}` : null;
  } else {
    const regla = reglas.find((r) => error.mensaje.includes(r.contiene));
    if (regla) {
      campos[regla.campo] = regla.mensaje ?? error.mensaje;
      general = null;
    }
  }
  return { campos, general };
}

function conMayuscula(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

function sinNulos<C extends string>(errores: Record<C, string | null>): Errores<C> {
  const resultado: Errores<C> = {};
  for (const campo of Object.keys(errores) as C[]) {
    const mensaje = errores[campo];
    if (mensaje) resultado[campo] = mensaje;
  }
  return resultado;
}
