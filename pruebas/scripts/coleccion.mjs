// Convierte la colección Postman local (formato v3: un archivo *.request.yaml por petición) al formato
// v2.1 que entiende Newman. La conversión se hace en memoria en cada corrida: la colección versionada no cambia.
//
// Uso directo: node scripts/coleccion.mjs --listar [--completo | --reasignacion]   (muestra las peticiones convertidas
// y si escriben datos)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DIR_COLECCION = join(RAIZ, "postman", "collections", "SGI-SEGANDINA");

/** Peticiones que nunca corren en la corrida automática (cambian la contraseña del dueño del token). */
export const EXCLUIDAS = new Set(["Usuarios Mi Contrasena"]);

/**
 * Peticiones que necesitan la sesión del Vigilante (E2E_VIGILANTE_*); sin esas variables se omiten.
 * "Registrar Incidencia Otra Zona" (CP-104) y "Usuarios Reasignar Zona Vigilante" (CP-124) no escriben: el backend
 * siempre las rechaza (400 y 403). Las dos de reasignación del Administrador (CP-121) sí escriben y devuelven al
 * Vigilante a su zona, así que además necesitan --completo.
 */
export const PETICIONES_VIGILANTE = new Set([
  "Login Vigilante",
  "Registrar Incidencia Otra Zona",
  "Usuarios Reasignar Zona Vigilante",
  "Usuarios Reasignar Zona",
  "Usuarios Reasignar Zona Restaurar",
  "Incidencias Por Zona Antes De Reasignar",
  "Incidencias Por Zona Despues De Reasignar",
]);

/**
 * Peticiones de la reasignación del Vigilante de prueba (CP-121 y CP-125): corren con --completo o con --reasignacion.
 * Lo mueven a otra zona, comprueban que las incidencias por zona no cambian y lo devuelven a la suya, así que solo
 * quedan dos filas REASIGNAR_ZONA en la auditoría. Las dos consultas de incidencias son GET pero solo tienen sentido
 * alrededor del cambio.
 */
export const ESCRITURAS_VIGILANTE = new Set([
  "Incidencias Por Zona Antes De Reasignar",
  "Usuarios Reasignar Zona",
  "Incidencias Por Zona Despues De Reasignar",
  "Usuarios Reasignar Zona Restaurar",
]);

/**
 * Peticiones que necesitan la sesión del Supervisor (E2E_SUPERVISOR_*); sin esas variables se omiten. No escriben: el
 * backend rechaza las de CP-123 (400 y 403).
 */
export const PETICIONES_SUPERVISOR = new Set([
  "Login Supervisor",
  "Usuarios Reasignar Zona Supervisor",
  "Usuarios Crear Supervisor",
  "Usuarios Cambiar Estado Supervisor",
]);

/**
 * Los login, los GET y las peticiones rechazadas del Vigilante y del Supervisor no modifican datos; el resto solo corre
 * con --completo (o, las de la reasignación, con --reasignacion).
 */
function esLectura(nombre, metodo) {
  if (ESCRITURAS_VIGILANTE.has(nombre)) return false;
  return metodo === "GET" || nombre === "Login" || PETICIONES_VIGILANTE.has(nombre) || PETICIONES_SUPERVISOR.has(nombre);
}

/** queryParams viene como objeto {clave: valor} o como lista [{key, value, disabled}]. */
function normalizarQuery(queryParams) {
  if (!queryParams) return [];
  if (Array.isArray(queryParams)) {
    return queryParams.map((p) => ({ key: p.key, value: String(p.value ?? ""), disabled: Boolean(p.disabled) }));
  }
  return Object.entries(queryParams).map(([key, value]) => ({ key, value: String(value ?? "") }));
}

function convertirPeticion(nombre, def) {
  const metodo = String(def.method || "GET").toUpperCase();
  const [base] = String(def.url).split("?");
  const query = normalizarQuery(def.queryParams);
  const raw = query.length
    ? `${base}?${query.filter((q) => !q.disabled).map((q) => `${q.key}=${q.value}`).join("&")}`
    : base;

  // Se usa la URL cruda: Newman la separa en partes después de resolver las variables.
  const request = { method: metodo, header: [], url: raw };

  if (def.body?.type === "json") {
    request.body = { mode: "raw", raw: String(def.body.content ?? ""), options: { raw: { language: "json" } } };
    request.header.push({ key: "Content-Type", value: "application/json" });
  }
  if (def.auth?.type === "noauth") request.auth = { type: "noauth" };
  if (def.auth?.type === "bearer") {
    // credentials es una lista [{key, value}]; Newman espera la misma forma en `bearer`.
    const token = (def.auth.credentials || []).find((c) => c.key === "token")?.value ?? "{{token}}";
    request.auth = { type: "bearer", bearer: [{ key: "token", value: token, type: "string" }] };
  }

  const event = [];
  for (const script of def.scripts || []) {
    const tipo = script.type === "afterResponse" ? "test" : script.type === "beforeRequest" ? "prerequest" : null;
    // Cada script va en una función que se ejecuta al momento: en el sandbox de Newman el ámbito global ya define
    // `data` (datos de la iteración) y un `const data` del script fallaría; en Postman cada script tiene su ámbito.
    const codigo = ["(function () {", ...String(script.code).split(/\r?\n/), "})();"];
    if (tipo) event.push({ listen: tipo, script: { type: "text/javascript", exec: codigo } });
  }

  return {
    nombre,
    orden: Number(def.order ?? 0),
    metodo,
    lectura: esLectura(nombre, metodo),
    item: { name: nombre, request, event },
  };
}

/** Lee la colección y la devuelve en formato v2.1, ordenada por `order`. */
export function cargarColeccion({ completo = false, vigilante = true, supervisor = true, reasignacion = false } = {}) {
  const archivos = readdirSync(DIR_COLECCION).filter((f) => f.endsWith(".request.yaml"));
  const peticiones = archivos
    .map((f) => convertirPeticion(f.replace(/\.request\.yaml$/, ""), parse(readFileSync(join(DIR_COLECCION, f), "utf8"))))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

  const incluidas = peticiones.filter(
    (p) =>
      !EXCLUIDAS.has(p.nombre) &&
      (completo || p.lectura || (reasignacion && ESCRITURAS_VIGILANTE.has(p.nombre))) &&
      (vigilante || !PETICIONES_VIGILANTE.has(p.nombre)) &&
      (supervisor || !PETICIONES_SUPERVISOR.has(p.nombre)),
  );

  // Autenticación de la colección (Bearer {{token}}), definida en .resources/definition.yaml
  let auth = { type: "bearer", bearer: [{ key: "token", value: "{{token}}", type: "string" }] };
  const defColeccion = join(DIR_COLECCION, ".resources", "definition.yaml");
  if (existsSync(defColeccion)) {
    const def = parse(readFileSync(defColeccion, "utf8"));
    const bearer = (def.auth || []).find((a) => a.type === "bearer");
    if (bearer) auth = { type: "bearer", bearer: [{ key: "token", value: bearer.credentials?.token ?? "{{token}}", type: "string" }] };
  }

  return {
    peticiones,
    incluidas,
    coleccion: {
      info: { name: "SGI-SEGANDINA", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
      auth,
      item: incluidas.map((p) => p.item),
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const completo = process.argv.includes("--completo");
  const reasignacion = process.argv.includes("--reasignacion");
  const { peticiones, incluidas } = cargarColeccion({ completo, reasignacion });
  const nombresIncluidos = new Set(incluidas.map((p) => p.nombre));
  for (const p of peticiones) {
    const marca = nombresIncluidos.has(p.nombre) ? "corre " : "omite ";
    console.log(`${marca} ${String(p.orden).padStart(5)} ${p.metodo.padEnd(6)} ${p.lectura ? "lectura  " : "escritura"} ${p.nombre}`);
  }
  console.log(`\n${peticiones.length} peticiones en la colección; ${incluidas.length} se ejecutan${completo ? " (--completo)" : reasignacion ? " (solo lectura + reasignación CP-121 y CP-125)" : " (solo lectura)"}.`);
}
