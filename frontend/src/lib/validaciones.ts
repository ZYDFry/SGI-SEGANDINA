/**
 * Reglas y mensajes de validación de los formularios. Los límites son los de los DTO del backend
 * (`LoginRequest`, `CambioContrasenaRequest`, `IncidenciaRequest`, `UsuarioCrearRequest`, `UsuarioActualizarRequest`,
 * `RestablecerContrasenaRequest`, `ZonaRequest`, `TipoEventoRequest`, `NivelGravedadRequest`, `AuditoriaFiltro`), de
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
/** Límites de `ZonaRequest`. */
export const ZONA_NOMBRE_MAX = 80;
export const DEPARTAMENTO_MAX = 50;
export const PROVINCIA_MAX = 50;
export const DISTRITO_MAX = 80;
export const REFERENCIA_MAX = 150;
/** Límite de `TipoEventoRequest`. */
export const TIPO_EVENTO_MAX = 30;
/** Límites de `NivelGravedadRequest` (`orden` es un `Short` de 1 en adelante). */
export const NIVEL_NOMBRE_MAX = 20;
export const ORDEN_MIN = 1;
export const ORDEN_MAX = 32767;
/** Nombre del rol que exige zona asignada (regla de `UsuarioService`). */
export const ROL_VIGILANTE = "Vigilante";

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
  rol: "Elige un rol",
  zonaVigilante: `El ${ROL_VIGILANTE} debe tener una zona asignada`,
  vigilante: "Elige un vigilante",
  ordenInvalido: `El orden debe ser un número entero entre ${ORDEN_MIN} y ${ORDEN_MAX}`,
  soloNumeros: "Solo se permiten números",
} as const;

/** Ayuda fija bajo el DNI de login y personal. */
export const AYUDA_DNI = `${LARGO_DNI} dígitos, solo números`;
/** Ayuda fija bajo el DNI del filtro de auditoría (acepta los primeros dígitos). */
export const AYUDA_DNI_BUSQUEDA = `Hasta ${LARGO_DNI} dígitos, solo números`;
/** Duración del aviso temporal "Solo se permiten números". */
export const AVISO_TEMPORAL_MS = 3000;

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

/** Indica si un texto escrito o pegado en el DNI trae algún carácter que no es dígito (se descarta y se avisa). */
export function tieneNoDigitos(texto: string): boolean {
  return /\D/.test(texto);
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

/**
 * Texto libre con largo máximo (zonas, tipos de evento, niveles), evaluado recortado como lo guarda el backend.
 *
 * @param valor    texto escrito
 * @param max      largo máximo del DTO
 * @param opcional si el campo puede quedar vacío
 */
export function validarTexto(valor: string, max: number, opcional = false): string | null {
  const texto = valor.trim();
  if (!texto) return opcional ? null : MENSAJES.obligatorio;
  return texto.length > max ? MENSAJES.maximo(max) : null;
}

/** Orden de un nivel de gravedad: entero de 1 a 32767 (escrito en un `<input type="number">`). */
export function validarOrden(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return MENSAJES.obligatorio;
  if (!SOLO_DIGITOS.test(texto)) return MENSAJES.ordenInvalido;
  const numero = Number(texto);
  return numero >= ORDEN_MIN && numero <= ORDEN_MAX ? null : MENSAJES.ordenInvalido;
}

export interface CamposUsuario {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  /** Solo al crear; en la edición la contraseña se cambia con "Restablecer contraseña". */
  contrasena: string;
  confirmacion: string;
  idRol: number | null;
  idZona: number | null;
}

export type CampoUsuario = keyof CamposUsuario;

/**
 * Formulario de personal, con los límites de `UsuarioCrearRequest` / `UsuarioActualizarRequest`.
 *
 * @param campos      valores del formulario
 * @param esVigilante si el rol elegido es Vigilante (la zona pasa a ser obligatoria)
 * @param conContrasena `true` al crear: se validan la contraseña temporal y su confirmación
 */
export function validarUsuario(
  campos: CamposUsuario,
  esVigilante: boolean,
  conContrasena: boolean,
): Errores<CampoUsuario> {
  return sinNulos({
    dni: validarDni(campos.dni),
    nombres: validarNombre(campos.nombres, NOMBRES_MAX),
    apellidoPaterno: validarNombre(campos.apellidoPaterno, APELLIDO_MAX),
    apellidoMaterno: validarNombre(campos.apellidoMaterno, APELLIDO_MAX, true),
    contrasena: conContrasena ? validarContrasenaNueva(campos.contrasena) : null,
    confirmacion: conContrasena ? validarConfirmacion(campos.confirmacion, campos.contrasena) : null,
    idRol: validarSeleccion(campos.idRol, MENSAJES.rol),
    idZona: esVigilante ? validarSeleccion(campos.idZona, MENSAJES.zonaVigilante) : null,
  });
}

export interface CamposRestablecer {
  nueva: string;
  confirmacion: string;
}

/** Contraseña temporal que asigna el Administrador (`RestablecerContrasenaRequest`): 8 a 72 y confirmada. */
export function validarRestablecer({ nueva, confirmacion }: CamposRestablecer): Errores<keyof CamposRestablecer> {
  return sinNulos({ nueva: validarContrasenaNueva(nueva), confirmacion: validarConfirmacion(confirmacion, nueva) });
}

export interface CamposZona {
  nombreZona: string;
  departamento: string;
  provincia: string;
  distrito: string;
  referencia: string;
  descripcion: string;
}

/** Formulario de zona con los límites de `ZonaRequest`; referencia y descripción son opcionales. */
export function validarZona(campos: CamposZona): Errores<keyof CamposZona> {
  return sinNulos({
    nombreZona: validarTexto(campos.nombreZona, ZONA_NOMBRE_MAX),
    departamento: validarTexto(campos.departamento, DEPARTAMENTO_MAX),
    provincia: validarTexto(campos.provincia, PROVINCIA_MAX),
    distrito: validarTexto(campos.distrito, DISTRITO_MAX),
    referencia: validarTexto(campos.referencia, REFERENCIA_MAX, true),
    descripcion: validarTexto(campos.descripcion, DESCRIPCION_MAX, true),
  });
}

export interface CamposTipoEvento {
  nombreTipoEvento: string;
}

export function validarTipoEvento({ nombreTipoEvento }: CamposTipoEvento): Errores<keyof CamposTipoEvento> {
  return sinNulos({ nombreTipoEvento: validarTexto(nombreTipoEvento, TIPO_EVENTO_MAX) });
}

export interface CamposNivel {
  nombreNivel: string;
  /** Texto del input numérico. */
  orden: string;
}

export function validarNivel({ nombreNivel, orden }: CamposNivel): Errores<keyof CamposNivel> {
  return sinNulos({ nombreNivel: validarTexto(nombreNivel, NIVEL_NOMBRE_MAX), orden: validarOrden(orden) });
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

/** Campos de la reasignación de zona (RF-07): zona destino al mover un vigilante o vigilante a traer a la zona. */
export type CampoReasignacion = "idZona" | "idUsuario";

/**
 * Reasignación de zona (`PATCH /api/usuarios/{id}/zona`): la zona destino es obligatoria, como `idZona` en
 * `ReasignarZonaRequest`; al traer un vigilante a la zona, también hay que elegirlo.
 *
 * @param campo campo que muestra el formulario
 * @param valor id elegido, o `null`
 */
export function validarReasignacion(campo: CampoReasignacion, valor: number | null): Errores<CampoReasignacion> {
  return sinNulos({
    [campo]: validarSeleccion(valor, campo === "idZona" ? MENSAJES.zona : MENSAJES.vigilante),
  } as Record<CampoReasignacion, string | null>);
}
