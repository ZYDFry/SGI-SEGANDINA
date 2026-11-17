// Convierte la colección Postman local (formato v3: un archivo *.request.yaml por petición) al formato
// v2.1 que entiende Newman. La conversión se hace en memoria en cada corrida: la colección versionada no cambia.
//
// Uso directo: node scripts/coleccion.mjs --listar   (muestra las peticiones convertidas y si escriben datos)

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
]);

/** Peticiones que usan al Vigilante de prueba y modifican datos: solo con --completo. */
const ESCRITURAS_VIGILANTE = new Set(["Usuarios Reasignar Zona", "Usuarios Reasignar Zona Restaurar"]);

/** Los login, los GET y las peticiones rechazadas del Vigilante no modifican datos; el resto solo corre con --completo. */
function esLectura(nombre, metodo) {
  return (
    metodo === "GET" ||
    nombre === "Login" ||
    (PETICIONES_VIGILANTE.has(nombre) && !ESCRITURAS_VIGILANTE.has(nombre))
  );
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
export function cargarColeccion({ completo = false, vigilante = true } = {}) {
  const archivos = readdirSync(DIR_COLECCION).filter((f) => f.endsWith(".request.yaml"));
  const peticiones = archivos
    .map((f) => convertirPeticion(f.replace(/\.request\.yaml$/, ""), parse(readFileSync(join(DIR_COLECCION, f), "utf8"))))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

  const incluidas = peticiones.filter(
    (p) => !EXCLUIDAS.has(p.nombre) && (completo || p.lectura) && (vigilante || !PETICIONES_VIGILANTE.has(p.nombre)),
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
  const { peticiones, incluidas } = cargarColeccion({ completo });
  const nombresIncluidos = new Set(incluidas.map((p) => p.nombre));
  for (const p of peticiones) {
    const marca = nombresIncluidos.has(p.nombre) ? "corre " : "omite ";
    console.log(`${marca} ${String(p.orden).padStart(5)} ${p.metodo.padEnd(6)} ${p.lectura ? "lectura  " : "escritura"} ${p.nombre}`);
  }
  console.log(`\n${peticiones.length} peticiones en la colección; ${incluidas.length} se ejecutan${completo ? " (--completo)" : " (solo lectura)"}.`);
}
