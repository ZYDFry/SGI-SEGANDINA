// Ejecuta la colección Postman con Newman contra el backend y deja:
//  - pruebas/reportes/newman/newman.html   reporte htmlextra (sin variables de entorno, sin Authorization y sin
//                                          los cuerpos de login ni de contraseñas)
//  - pruebas/reportes/newman/resumen.json  resumen saneado que usa reporte.mjs (sin credenciales ni tokens)
//
// El environment se arma en memoria desde variables de entorno; nunca se escribe en disco.
// Uso: node scripts/newman.mjs [--completo]

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import newman from "newman";
import { cargarColeccion } from "./coleccion.mjs";
import { CASO_POR_PETICION } from "../casos.mjs";

const DIR_PRUEBAS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_SALIDA = join(DIR_PRUEBAS, "reportes", "newman");
const completo = process.argv.includes("--completo");

/** Peticiones cuyo cuerpo (de ida o de vuelta) puede llevar contraseñas o el token. */
const CUERPOS_OCULTOS = ["Login", "Usuarios Crear", "Usuarios Restablecer Contrasena", "Usuarios Mi Contrasena"];

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
};

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

const { coleccion, incluidas } = cargarColeccion({ completo });
console.log(`Newman: ${incluidas.length} peticiones contra ${baseUrl}${completo ? " (modo completo, escribe datos)" : " (solo lectura)"}.`);

mkdirSync(DIR_SALIDA, { recursive: true });

newman.run(
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

    // Solo nombres, códigos y aserciones: nada de cuerpos, cabeceras ni variables.
    const peticiones = summary.run.executions.map((ejecucion) => {
      const nombre = ejecucion.item.name;
      const aserciones = (ejecucion.assertions || []).map((a) => ({ nombre: a.assertion, ok: !a.error, error: a.error ? a.error.message : null }));
      const errorPeticion = ejecucion.requestError ? ejecucion.requestError.message : null;
      return {
        nombre,
        caso: CASO_POR_PETICION[nombre] || null,
        metodo: ejecucion.request?.method,
        ruta: ejecucion.request?.url?.getPath?.() || null,
        codigo: ejecucion.response?.code ?? null,
        tiempoMs: ejecucion.response?.responseTime ?? null,
        aserciones,
        errorPeticion,
        ok: !errorPeticion && aserciones.length > 0 && aserciones.every((a) => a.ok),
      };
    });

    const aprobadas = peticiones.filter((p) => p.ok).length;
    guardarResumen({ ejecutado: true, completo, fecha: new Date().toISOString(), baseUrl, total: peticiones.length, aprobadas, fallidas: peticiones.length - aprobadas, peticiones });
    console.log(`Newman: ${aprobadas} de ${peticiones.length} peticiones aprobadas. Reporte: ${join(DIR_SALIDA, "newman.html")}`);
    process.exit(aprobadas === peticiones.length ? 0 : 1);
  },
);
