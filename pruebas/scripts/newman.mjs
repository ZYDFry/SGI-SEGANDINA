// Ejecuta la colección Postman con Newman contra el backend y deja:
//  - pruebas/reportes/newman/newman.html   reporte htmlextra (sin variables de entorno, sin Authorization y sin
//                                          los cuerpos de login ni de contraseñas)
//  - pruebas/reportes/newman/resumen.json  resumen saneado que usa reporte.mjs (sin credenciales ni tokens)
//
// El environment se arma en memoria desde variables de entorno; nunca se escribe en disco.
// Uso: node scripts/newman.mjs [--completo | --reasignacion | --correccion]
//  --reasignacion: lectura más CP-121 y CP-125 (mueve al Vigilante de prueba a otra zona, comprueba que las
//                  incidencias por zona no cambian y lo devuelve); no toca otros datos.
//  --correccion:   lectura más CP-129 a CP-131 (registra 1 incidencia de prueba del Administrador, la corrige y
//                  prueba los rechazos de plazo y de autor); no toca usuarios, zonas, tipos ni niveles.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import newman from "newman";
import { cargarColeccion } from "./coleccion.mjs";
import { CASO_POR_PETICION } from "../casos.mjs";

const DIR_PRUEBAS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_SALIDA = join(DIR_PRUEBAS, "reportes", "newman");
const completo = process.argv.includes("--completo");
const reasignacion = !completo && process.argv.includes("--reasignacion");
const correccion = !completo && !reasignacion && process.argv.includes("--correccion");
const MODO = completo
  ? " (modo completo, escribe datos)"
  : reasignacion
    ? " (solo lectura + reasignación CP-121 y CP-125)"
    : correccion
      ? " (solo lectura + corrección CP-129 a CP-131: 1 incidencia de prueba)"
      : " (solo lectura)";

/** Peticiones cuyo cuerpo (de ida o de vuelta) puede llevar contraseñas o el token. */
const CUERPOS_OCULTOS = ["Login", "Login Vigilante", "Login Supervisor", "Usuarios Crear", "Usuarios Restablecer Contrasena", "Usuarios Mi Contrasena"];

/** Fecha AAAA-MM-DD en hora de Lima. */
function fechaLima(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
}

function guardarResumen(resumen) {
  mkdirSync(DIR_SALIDA, { recursive: true });
  writeFileSync(join(DIR_SALIDA, "resumen.json"), JSON.stringify(resumen, null, 2), "utf8");
}

const baseUrl = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const dni = process.env.E2E_ADMIN_DNI;
const contrasena = process.env.E2E_ADMIN_PASSWORD;
// Opcionales: con ellas corre CP-104 (un Vigilante no puede registrar en otra zona).
const dniVigilante = process.env.E2E_VIGILANTE_DNI;
const contrasenaVigilante = process.env.E2E_VIGILANTE_PASSWORD;
const conVigilante = Boolean(dniVigilante && contrasenaVigilante);
// Opcionales: con ellas corre CP-123 (el Supervisor no puede reasignar a otro rol ni gestionar usuarios).
const dniSupervisor = process.env.E2E_SUPERVISOR_DNI;
const contrasenaSupervisor = process.env.E2E_SUPERVISOR_PASSWORD;
const conSupervisor = Boolean(dniSupervisor && contrasenaSupervisor);

if (!dni || !contrasena) {
  console.error("Newman no se ejecutó: faltan E2E_ADMIN_DNI y/o E2E_ADMIN_PASSWORD.");
  guardarResumen({ ejecutado: false, motivo: "Faltan E2E_ADMIN_DNI y/o E2E_ADMIN_PASSWORD.", fecha: new Date().toISOString(), peticiones: [] });
  process.exit(2);
}

const hoy = fechaLima();
const valores = {
  baseUrl,
  dni,
  contrasena,
  token: "",
  periodo: "ULTIMOS_30_DIAS",
  desde: `${hoy.slice(0, 8)}01`,
  hasta: hoy,
  accionAuditoria: "LOGIN_FALLIDO",
  qAuditoria: "9999",
  dniVigilante: dniVigilante ?? "",
  contrasenaVigilante: contrasenaVigilante ?? "",
  tokenVigilante: "",
  idZonaVigilante: "",
  idZonaAjena: "",
  dniSupervisor: dniSupervisor ?? "",
  contrasenaSupervisor: contrasenaSupervisor ?? "",
  tokenSupervisor: "",
  idSupervisor: "",
  idZonaPrueba: "",
  idTipoPrueba: "",
  idNivelPrueba: "",
  idIncidenciaCorregir: "",
  idIncidenciaVencida: "",
  tokenVencida: "",
  idZonaVencida: "",
  idTipoVencida: "",
  idNivelVencida: "",
};

if (reasignacion && !conVigilante) {
  console.error("--reasignacion necesita E2E_VIGILANTE_DNI y E2E_VIGILANTE_PASSWORD (CP-121 mueve a ese Vigilante y lo devuelve).");
  process.exit(2);
}

if (completo) {
  const temporal = process.env.PRUEBAS_CONTRASENA_TEMPORAL;
  if (!temporal) {
    console.error("--completo necesita PRUEBAS_CONTRASENA_TEMPORAL (contraseña temporal de 8 a 72 caracteres).");
    process.exit(2);
  }
  // DNI ficticio distinto en cada corrida para que "Usuarios Crear" no choque con el de la anterior.
  valores.dniNuevo = `7${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  valores.contrasenaInicial = temporal;
  valores.contrasenaNueva = temporal;
}

const { coleccion, incluidas } = cargarColeccion({
  completo,
  vigilante: conVigilante,
  supervisor: conSupervisor,
  reasignacion,
  correccion,
});
if (correccion && !conVigilante) console.log("Sin E2E_VIGILANTE_*: se omite CP-131 (corregir la incidencia ajena).");
if (!conVigilante) console.log("Sin E2E_VIGILANTE_DNI/E2E_VIGILANTE_PASSWORD: se omiten CP-104 y CP-124 (peticiones del Vigilante).");
if (!conSupervisor) console.log("Sin E2E_SUPERVISOR_DNI/E2E_SUPERVISOR_PASSWORD: se omite CP-123 (peticiones del Supervisor).");
console.log(`Newman: ${incluidas.length} peticiones contra ${baseUrl}${MODO}.`);

mkdirSync(DIR_SALIDA, { recursive: true });

/** Petición real de cada ítem de la colección (por `item.id`), sin las de `pm.sendRequest` de sus scripts. */
const reales = new Map();

const corrida = newman.run(
  {
    collection: coleccion,
    environment: { name: "sgi-pruebas", values: Object.entries(valores).map(([key, value]) => ({ key, value, type: "default", enabled: true })) },
    reporters: ["cli", "htmlextra"],
    reporter: {
      htmlextra: {
        export: join(DIR_SALIDA, "newman.html"),
        title: "SGI-SEGANDINA — Integración API (Newman)",
        browserTitle: "SGI-SEGANDINA Newman",
        skipEnvironmentVars: true,
        skipGlobalVars: true,
        skipHeaders: "Authorization",
        hideRequestBody: CUERPOS_OCULTOS,
        hideResponseBody: CUERPOS_OCULTOS,
        omitHeaders: false,
      },
    },
    timeoutRequest: 30000,
  },
  (error, summary) => {
    if (error) {
      console.error(`Newman no pudo ejecutarse: ${error.message}`);
      guardarResumen({ ejecutado: false, motivo: `Error de Newman: ${error.message}`, fecha: new Date().toISOString(), peticiones: [] });
      process.exit(1);
    }

    const peticiones = resumirEjecuciones(summary.run.executions, reales);

    const aprobadas = peticiones.filter((p) => p.ok).length;
    guardarResumen({ ejecutado: true, completo, reasignacion, correccion, fecha: new Date().toISOString(), baseUrl, total: peticiones.length, aprobadas, fallidas: peticiones.length - aprobadas, peticiones });
    console.log(`Newman: ${aprobadas} de ${peticiones.length} peticiones aprobadas. Reporte: ${join(DIR_SALIDA, "newman.html")}`);
    process.exit(aprobadas === peticiones.length ? 0 : 1);
  },
);

// Newman emite "request" también por cada pm.sendRequest de los scripts (p. ej. "Corregir Incidencia" consulta la
// auditoría y "Corregir Incidencia Vencida" busca una incidencia vencida). Esas llamadas son GET dentro de peticiones
// PUT, así que se guarda solo la que tiene el método definido en la colección.
corrida.on("request", (error, args) => {
  if (!args?.item || !args.request) return;
  const definido = String(args.item.request?.method || "GET").toUpperCase();
  if (String(args.request.method || "").toUpperCase() !== definido) return;
  reales.set(args.item.id, {
    metodo: args.request.method,
    ruta: args.request.url?.getPath?.() || null,
    codigo: args.response?.code ?? null,
    tiempoMs: args.response?.responseTime ?? null,
  });
});

/**
 * Una fila por petición de la colección: `summary.run.executions` repite una petición cuando sus scripts usan
 * pm.sendRequest, y esas filas muestran la URL de la última llamada. Se deja la última ejecución de cada ítem (con
 * sus aserciones) y el método, la ruta, el código y el tiempo de la petición real. Solo nombres, códigos y
 * aserciones: nada de cuerpos, cabeceras ni variables.
 */
function resumirEjecuciones(ejecuciones, realesPorItem) {
  const porItem = new Map();
  for (const ejecucion of ejecuciones) porItem.set(ejecucion.item.id ?? ejecucion.item.name, ejecucion);
  return [...porItem.entries()].map(([clave, ejecucion]) => {
    const nombre = ejecucion.item.name;
    const real = realesPorItem.get(clave);
    const aserciones = (ejecucion.assertions || []).map((a) => ({ nombre: a.assertion, ok: !a.error, error: a.error ? a.error.message : null }));
    const errorPeticion = ejecucion.requestError ? ejecucion.requestError.message : null;
    return {
      nombre,
      caso: CASO_POR_PETICION[nombre] || null,
      metodo: real?.metodo ?? ejecucion.request?.method,
      ruta: real?.ruta ?? (ejecucion.request?.url?.getPath?.() || null),
      codigo: real?.codigo ?? ejecucion.response?.code ?? null,
      tiempoMs: real?.tiempoMs ?? ejecucion.response?.responseTime ?? null,
      aserciones,
      errorPeticion,
      ok: !errorPeticion && aserciones.length > 0 && aserciones.every((a) => a.ok),
    };
  });
}
