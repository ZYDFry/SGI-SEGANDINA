// Genera las evidencias de pruebas a partir de los resultados de la última corrida:
//  - docs/evidencias/pruebas/index.html        portada, resumen por tipo, enlaces y galería por caso
//  - docs/evidencias/pruebas/reporte_pruebas.pdf  el mismo contenido en A4 (Chromium de Playwright)
//  - pruebas/reportes/resumen-casos.json       estado por caso, para llenar el plan de pruebas
//
// Fuentes: Surefire (backend/target/surefire-reports), JaCoCo (backend/target/site/jacoco/jacoco.csv),
// Newman (pruebas/reportes/newman/resumen.json) y Playwright (pruebas/reportes/playwright/resultados.json).
// Una fuente que no corrió se muestra como "No ejecutado"; nunca se cuenta como aprobada.
//
// Al final busca contraseñas de prueba (variables E2E_*_PASSWORD, PRUEBAS_CONTRASENA_TEMPORAL), DNIs de prueba y
// tokens JWT en lo generado; si aparece alguno en index.html, falla.
//
// Uso: node scripts/reporte.mjs [--sin-pdf]

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { CASOS, TIPOS } from "../casos.mjs";

const DIR_PRUEBAS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DIR_PRUEBAS, "..");
const DIR_EVIDENCIAS = join(RAIZ, "docs", "evidencias", "pruebas");
const DIR_CAPTURAS = join(DIR_EVIDENCIAS, "capturas");
const ARCHIVO_HTML = join(DIR_EVIDENCIAS, "index.html");
const ARCHIVO_PDF = join(DIR_EVIDENCIAS, "reporte_pruebas.pdf");
const DIR_REPORTES = join(DIR_PRUEBAS, "reportes");

const RUTAS = {
  surefireXml: join(RAIZ, "backend", "target", "surefire-reports"),
  surefireHtml: join(RAIZ, "backend", "target", "reports", "surefire.html"),
  jacocoCsv: join(RAIZ, "backend", "target", "site", "jacoco", "jacoco.csv"),
  jacocoHtml: join(RAIZ, "backend", "target", "site", "jacoco", "index.html"),
  newmanJson: join(DIR_REPORTES, "newman", "resumen.json"),
  newmanHtml: join(DIR_REPORTES, "newman", "newman.html"),
  playwrightJson: join(DIR_REPORTES, "playwright", "resultados.json"),
  playwrightHtml: join(DIR_REPORTES, "playwright", "html", "index.html"),
};

const ESTADO = { APROBADO: "Aprobado", FALLIDO: "Fallido", NO_EJECUTADO: "No ejecutado" };

// ---------------------------------------------------------------- utilidades

const esc = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Quita los códigos de color ANSI de los mensajes de error de Playwright. */
const sinAnsi = (texto) => String(texto ?? "").replace(/\u001b\[[0-9;]*m/g, "");

/** Primera línea útil de un mensaje de error, recortada. */
function resumenError(texto, max = 300) {
  const limpio = sinAnsi(texto).trim();
  const linea = limpio.split(/\r?\n/).filter((l) => l.trim()).slice(0, 3).join(" · ");
  return linea.length > max ? `${linea.slice(0, max)}…` : linea;
}

function atributos(etiqueta) {
  const datos = {};
  for (const m of etiqueta.matchAll(/(\w+)="([^"]*)"/g)) datos[m[1]] = m[2];
  return datos;
}

const decodificarXml = (t) => String(t).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function git(comando) {
  try {
    return execSync(`git ${comando}`, { cwd: RAIZ, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "—";
  }
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" });

// ---------------------------------------------------------------- lectura de resultados

/** Surefire: una prueba por <testcase>; fallo si tiene <failure> o <error>. */
function leerSurefire() {
  if (!existsSync(RUTAS.surefireXml)) return { ejecutado: false, motivo: "No hay resultados de Surefire (backend/target/surefire-reports)." };
  const archivos = readdirSync(RUTAS.surefireXml).filter((f) => /^TEST-.*\.xml$/.test(f));
  if (!archivos.length) return { ejecutado: false, motivo: "No hay archivos TEST-*.xml de Surefire." };

  const clases = [];
  const fallos = [];
  let total = 0, fallidas = 0, omitidas = 0, fecha = 0;
  for (const archivo of archivos) {
    const ruta = join(RUTAS.surefireXml, archivo);
    fecha = Math.max(fecha, statSync(ruta).mtimeMs);
    const xml = readFileSync(ruta, "utf8");
    const suite = atributos(xml.match(/<testsuite\b[^>]*>/)?.[0] ?? "");
    const pruebas = Number(suite.tests || 0);
    const conFallo = Number(suite.failures || 0) + Number(suite.errors || 0);
    const saltadas = Number(suite.skipped || 0);
    total += pruebas;
    fallidas += conFallo;
    omitidas += saltadas;
    clases.push({ nombre: (suite.name || archivo).replace(/^com\.segandina\.sgi\./, ""), pruebas, fallidas: conFallo, omitidas: saltadas });
    for (const m of xml.matchAll(/<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g)) {
      const caso = atributos(m[1]);
      const error = m[2].match(/<(failure|error)\b([^>]*)>/);
      if (error) fallos.push({ prueba: `${(caso.classname || "").replace(/^com\.segandina\.sgi\./, "")}.${caso.name}`, mensaje: decodificarXml(atributos(error[2]).message || error[1]) });
    }
  }
  clases.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { ejecutado: true, total, fallidas, omitidas, aprobadas: total - fallidas - omitidas, clases, fallos, fecha: new Date(fecha) };
}

/** JaCoCo: cobertura de instrucciones y de líneas a partir del CSV. */
function leerJacoco() {
  if (!existsSync(RUTAS.jacocoCsv)) return null;
  const [cabecera, ...filas] = readFileSync(RUTAS.jacocoCsv, "utf8").trim().split(/\r?\n/);
  const col = cabecera.split(",");
  const suma = (nombre) => filas.reduce((s, f) => s + Number(f.split(",")[col.indexOf(nombre)] || 0), 0);
  const porcentaje = (perdidas, cubiertas) => (cubiertas + perdidas ? (100 * cubiertas) / (cubiertas + perdidas) : 0);
  return {
    instrucciones: porcentaje(suma("INSTRUCTION_MISSED"), suma("INSTRUCTION_COVERED")),
    lineas: porcentaje(suma("LINE_MISSED"), suma("LINE_COVERED")),
    ramas: porcentaje(suma("BRANCH_MISSED"), suma("BRANCH_COVERED")),
  };
}

function leerNewman() {
  if (!existsSync(RUTAS.newmanJson)) return { ejecutado: false, motivo: "Newman no se ejecutó (no hay pruebas/reportes/newman/resumen.json)." };
  const datos = JSON.parse(readFileSync(RUTAS.newmanJson, "utf8"));
  if (!datos.ejecutado) return { ejecutado: false, motivo: datos.motivo || "Newman no se ejecutó." };
  return { ...datos, fecha: new Date(datos.fecha) };
}

/** Recorre las suites anidadas del reporte JSON de Playwright. */
function* specsDe(suite, ruta = []) {
  const titulo = suite.title && !/\.(ts|js)$/.test(suite.title) ? [...ruta, suite.title] : ruta;
  for (const spec of suite.specs || []) yield { spec, ruta: titulo, archivo: spec.file || suite.file };
  for (const hija of suite.suites || []) yield* specsDe(hija, titulo);
}

function leerPlaywright() {
  if (!existsSync(RUTAS.playwrightJson)) return { ejecutado: false, motivo: "Playwright no se ejecutó (no hay pruebas/reportes/playwright/resultados.json)." };
  const datos = JSON.parse(readFileSync(RUTAS.playwrightJson, "utf8"));
  const pruebas = [];
  for (const raiz of datos.suites || []) {
    for (const { spec, ruta, archivo } of specsDe(raiz)) {
      for (const t of spec.tests || []) {
        const resultado = t.results?.[t.results.length - 1] || {};
        const anotaciones = [...(t.annotations || []), ...(resultado.annotations || [])];
        // El ID va en el título ("CP-13 …") y en la anotación "caso"; el título sirve también si la prueba se omitió
        // antes de ejecutar su cuerpo.
        const casos = [...new Set([...spec.title.matchAll(/CP-\d+/g)].map((m) => m[0]).concat(anotaciones.filter((a) => a.type === "caso").map((a) => a.description)))];
        const motivoSalto = anotaciones.find((a) => a.type === "skip")?.description;
        const estado = t.status === "skipped" ? "omitida" : t.status === "expected" || t.status === "flaky" ? "aprobada" : "fallida";
        // Playwright copia los adjuntos a su carpeta de resultados: la captura se busca por el nombre del adjunto.
        const capturas = (resultado.attachments || [])
          .filter((a) => a.contentType === "image/png" && a.name && existsSync(join(DIR_CAPTURAS, `${a.name}.png`)))
          .map((a) => `${a.name}.png`);
        pruebas.push({
          titulo: [...ruta, spec.title].join(" › "),
          archivo,
          proyecto: t.projectName,
          casos,
          estado,
          error: resultado.error?.message ? resumenError(resultado.error.message) : resultado.errors?.[0]?.message ? resumenError(resultado.errors[0].message) : null,
          motivoSalto: motivoSalto || null,
          duracionMs: resultado.duration ?? 0,
          capturas,
        });
      }
    }
  }
  return { ejecutado: true, fecha: new Date(datos.stats?.startTime || Date.now()), pruebas, sesiones: pruebas.filter((p) => p.proyecto === "sesiones"), casosPrueba: pruebas.filter((p) => p.proyecto !== "sesiones") };
}

// ---------------------------------------------------------------- consolidación por caso

function consolidar(surefire, jacoco, newman, playwright) {
  const porCaso = new Map();
  const asegurar = (id) => {
    if (!porCaso.has(id)) porCaso.set(id, { id, ...(CASOS[id] || { rf: "—", tipo: "E2E", descripcion: "(caso sin catálogo)", esperado: "—", automatiza: "—" }), pruebas: [], capturas: [] });
    return porCaso.get(id);
  };

  // Backend → CP-01
  const cp01 = asegurar("CP-01");
  if (surefire.ejecutado) {
    cp01.pruebas.push({ titulo: `${surefire.total} tests de JUnit en ${surefire.clases.length} clases`, estado: surefire.fallidas ? "fallida" : "aprobada", error: surefire.fallos.map((f) => `${f.prueba}: ${resumenError(f.mensaje, 160)}`).join(" | ") || null });
    cp01.detalleObtenido = `${surefire.aprobadas} de ${surefire.total} tests aprobados, ${surefire.fallidas} con fallo o error, ${surefire.omitidas} omitidos.${jacoco ? ` Cobertura: ${jacoco.instrucciones.toFixed(1)} % de instrucciones, ${jacoco.lineas.toFixed(1)} % de líneas, ${jacoco.ramas.toFixed(1)} % de ramas.` : ""}`;
  }

  // Newman → por petición
  if (newman.ejecutado) {
    for (const p of newman.peticiones) {
      if (!p.caso) continue;
      const errores = [p.errorPeticion, ...p.aserciones.filter((a) => !a.ok).map((a) => `${a.nombre}: ${a.error}`)].filter(Boolean);
      asegurar(p.caso).pruebas.push({
        titulo: `${p.metodo} ${p.ruta ?? ""} — «${p.nombre}» → ${p.codigo ?? "sin respuesta"}${p.tiempoMs != null ? ` (${p.tiempoMs} ms)` : ""}`,
        estado: p.ok ? "aprobada" : "fallida",
        error: errores.join(" | ") || (p.aserciones.length ? null : "La petición no tiene aserciones"),
      });
    }
  }

  // Playwright → por anotación de caso
  if (playwright.ejecutado) {
    for (const p of playwright.casosPrueba) {
      for (const id of p.casos.length ? p.casos : ["(sin caso)"]) {
        const c = asegurar(id);
        c.pruebas.push({ titulo: p.titulo, estado: p.estado, error: p.error, motivoSalto: p.motivoSalto });
        for (const captura of p.capturas) if (!c.capturas.includes(captura)) c.capturas.push(captura);
      }
    }
  }

  // Casos del catálogo sin resultados en esta corrida
  for (const [id, datos] of Object.entries(CASOS)) if (!datos.soloCompleto) asegurar(id);

  for (const c of porCaso.values()) {
    const ejecutadas = c.pruebas.filter((p) => p.estado !== "omitida");
    const fallidas = ejecutadas.filter((p) => p.estado === "fallida");
    c.estado = !ejecutadas.length ? ESTADO.NO_EJECUTADO : fallidas.length ? ESTADO.FALLIDO : ESTADO.APROBADO;
    if (!c.detalleObtenido) {
      if (!ejecutadas.length) {
        const motivo = c.pruebas.find((p) => p.motivoSalto)?.motivoSalto;
        c.detalleObtenido = c.pruebas.length ? `Omitido en esta corrida${motivo ? `: ${motivo}` : ""}.` : "Sin resultados en esta corrida.";
      } else {
        c.detalleObtenido = `${ejecutadas.length - fallidas.length} de ${ejecutadas.length} pruebas aprobadas.${fallidas.length ? ` Fallos: ${fallidas.map((f) => f.error || f.titulo).join(" | ")}` : ""}`;
      }
    }
  }
  return [...porCaso.values()].sort((a, b) => Number(a.id.replace(/\D/g, "")) - Number(b.id.replace(/\D/g, "")));
}

/** Conteo de pruebas individuales y de casos por tipo. */
function resumenPorTipo(casos, surefire, newman, playwright) {
  const filas = TIPOS.map((t) => ({ ...t, aprobadas: 0, fallidas: 0, omitidas: 0, casosAprobados: 0, casosFallidos: 0, casosNoEjecutados: 0, ejecutado: false }));
  const fila = (id) => filas.find((f) => f.id === id);

  if (surefire.ejecutado) Object.assign(fila("BACKEND"), { aprobadas: surefire.aprobadas, fallidas: surefire.fallidas, omitidas: surefire.omitidas, ejecutado: true });
  if (newman.ejecutado) {
    const f = fila("API");
    f.ejecutado = true;
    for (const p of newman.peticiones) p.ok ? f.aprobadas++ : f.fallidas++;
  }
  if (playwright.ejecutado) {
    for (const p of playwright.casosPrueba) {
      const tipo = CASOS[p.casos[0]]?.tipo || "E2E";
      const f = fila(tipo) || fila("E2E");
      f.ejecutado = true;
      if (p.estado === "aprobada") f.aprobadas++;
      else if (p.estado === "fallida") f.fallidas++;
      else f.omitidas++;
    }
  }
  for (const c of casos) {
    const f = fila(c.tipo);
    if (!f) continue;
    if (c.estado === ESTADO.APROBADO) f.casosAprobados++;
    else if (c.estado === ESTADO.FALLIDO) f.casosFallidos++;
    else f.casosNoEjecutados++;
  }
  return filas;
}

// ---------------------------------------------------------------- HTML

const CSS = `
:root{--azul-900:#1e3a8a;--azul-800:#1e40af;--azul-50:#eff6ff;--gris-900:#0f172a;--gris-700:#334155;--gris-500:#64748b;
--gris-300:#cbd5e1;--gris-100:#f1f5f9;--gris-50:#f8fafc;--verde:#15803d;--verde-50:#f0fdf4;--rojo:#b91c1c;--rojo-50:#fef2f2;
--ambar:#a16207;--ambar-50:#fefce8}
*{box-sizing:border-box}
body{margin:0;background:var(--gris-100);color:var(--gris-900);font:14px/1.5 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 48px}
h1,h2,h3{color:var(--azul-900);line-height:1.25}
h2{font-size:22px;margin:40px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--azul-900)}
h3{font-size:17px;margin:0}
a{color:var(--azul-800)}
.portada{background:var(--azul-900);color:#fff;border-radius:16px;padding:40px 32px}
.portada h1{color:#fff;font-size:30px;margin:12px 0 4px}
.portada .logo{display:inline-flex;width:56px;height:56px;border-radius:14px;background:#fff;color:var(--azul-900);font-weight:700;font-size:22px;align-items:center;justify-content:center}
.portada dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:24px 0 0}
.portada dt{color:#bfdbfe}.portada dd{margin:0}
.tarjeta{background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgb(15 23 42/.08);margin:12px 0}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--gris-300);vertical-align:top}
th{background:var(--gris-50);color:var(--gris-700);font-weight:600}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.estado{display:inline-block;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600;white-space:nowrap}
.estado.Aprobado,.estado.aprobada{background:var(--verde-50);color:var(--verde);border:1px solid #bbf7d0}
.estado.Fallido,.estado.fallida{background:var(--rojo-50);color:var(--rojo);border:1px solid #fecaca}
.estado.omitida,.estado.no-ejecutado{background:var(--ambar-50);color:var(--ambar);border:1px solid #fde68a}
.indice ol{margin:0;padding-left:20px}.indice li{margin:3px 0}
.metricas{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.metrica{background:#fff;border-radius:12px;padding:14px;border-left:4px solid var(--azul-900)}
.metrica b{display:block;font-size:26px;color:var(--azul-900)}.metrica.mal{border-left-color:var(--rojo)}.metrica.mal b{color:var(--rojo)}
.caso header{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:baseline;margin-bottom:8px}
.caso .id{font-weight:700;color:var(--azul-900);font-size:16px}
.caso .rf{color:var(--gris-500);font-size:12px}
.caso dl{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;margin:0 0 8px}
.caso dt{color:var(--gris-500);font-weight:600}.caso dd{margin:0}
.caso.Fallido{border-left:4px solid var(--rojo)}
.pruebas{font-size:12.5px;margin:6px 0 0;padding-left:18px}.pruebas li{margin:2px 0}
.error{color:var(--rojo);font-size:12px;word-break:break-word}
.capturas{display:grid;grid-template-columns:1fr;gap:12px;margin-top:10px}
figure{margin:0;background:var(--gris-50);border:1px solid var(--gris-300);border-radius:8px;padding:8px}
figure img{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:4px}
figure.movil img{max-width:280px}
figcaption{font-size:12px;color:var(--gris-700);margin-top:6px;text-align:center;word-break:break-all}
.nota{color:var(--gris-500);font-size:12.5px}
.enlaces li{margin:4px 0}
@media (max-width:640px){.caso dl{grid-template-columns:1fr}.portada{padding:28px 20px}}
@media print{
  @page{size:A4;margin:14mm 12mm 16mm}
  body{background:#fff;font-size:11px}
  main{max-width:none;padding:0}
  .portada{border-radius:0;min-height:255mm;display:flex;flex-direction:column;justify-content:center;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .indice{break-after:page}
  #reportes .tarjeta,#fallidos .tarjeta,.metricas{break-inside:avoid}
  .seccion-tipo{break-before:page}
  h2{margin-top:0}
  .encabezado-seccion{margin:0 0 4px}
  .tarjeta,.metrica{box-shadow:none;border:1px solid var(--gris-300)}
  .caso header,.caso dl{break-inside:avoid}
  .caso h3,.caso header{break-after:avoid}
  figure{break-inside:avoid;page-break-inside:avoid}
  figure img{max-height:200mm;width:auto}
  figure.movil img{max-height:150mm}
  tr{break-inside:avoid}
  a{color:inherit;text-decoration:none}
}`;

function insignia(estado) {
  const clase = estado === ESTADO.NO_EJECUTADO ? "no-ejecutado" : estado;
  return `<span class="estado ${esc(clase)}">${esc(estado)}</span>`;
}

function enlaceReporte(titulo, ruta, descripcion) {
  const href = relative(DIR_EVIDENCIAS, ruta).split("\\").join("/");
  return existsSync(ruta)
    ? `<li><a href="${esc(href)}">${esc(titulo)}</a> — ${esc(descripcion)} <span class="nota">(${esc(href)})</span></li>`
    : `<li>${esc(titulo)} — <span class="nota">no generado en esta corrida</span></li>`;
}

function tarjetaCaso(c) {
  const capturas = c.capturas
    .map((archivo) => {
      const movil = /movil|360/.test(archivo);
      return `<figure class="${movil ? "movil" : ""}"><img src="capturas/${esc(archivo)}" alt="${esc(archivo)}" loading="lazy"><figcaption>${esc(archivo)}</figcaption></figure>`;
    })
    .join("");
  const pruebas = c.pruebas
    .map((p) => `<li>${insignia(p.estado)} ${esc(p.titulo)}${p.error ? `<div class="error">${esc(p.error)}</div>` : ""}${p.estado === "omitida" && p.motivoSalto ? `<div class="nota">${esc(p.motivoSalto)}</div>` : ""}</li>`)
    .join("");
  return `<article class="tarjeta caso ${esc(c.estado)}" id="${esc(c.id)}">
  <header><span class="id">${esc(c.id)}</span><span class="rf">${esc(c.rf)}</span>${insignia(c.estado)}</header>
  <dl>
    <dt>Descripción</dt><dd>${esc(c.descripcion)}</dd>
    <dt>Resultado esperado</dt><dd>${esc(c.esperado)}</dd>
    <dt>Resultado obtenido</dt><dd>${esc(c.detalleObtenido)}</dd>
    <dt>Alcance automatizado</dt><dd>${esc(c.automatiza)}</dd>
  </dl>
  ${pruebas ? `<ul class="pruebas">${pruebas}</ul>` : ""}
  ${capturas ? `<div class="capturas">${capturas}</div>` : ""}
</article>`;
}

function generarHtml({ casos, filas, surefire, jacoco, newman, playwright, fechaGeneracion }) {
  const total = (campo) => filas.reduce((s, f) => s + f[campo], 0);
  const fechaEjecucion = [surefire.fecha, newman.fecha, playwright.fecha].filter(Boolean).sort((a, b) => b - a)[0] || fechaGeneracion;
  const casosFallidos = casos.filter((c) => c.estado === ESTADO.FALLIDO);

  const secciones = TIPOS.map((t) => {
    const delTipo = casos.filter((c) => c.tipo === t.id);
    if (!delTipo.length) return "";
    let extra = "";
    if (t.id === "BACKEND" && surefire.ejecutado) {
      extra = `<div class="tarjeta"><h3>Tests por clase</h3><table><thead><tr><th>Clase</th><th class="num">Tests</th><th class="num">Fallidos</th><th class="num">Omitidos</th></tr></thead><tbody>${surefire.clases
        .map((c) => `<tr><td>${esc(c.nombre)}</td><td class="num">${c.pruebas}</td><td class="num">${c.fallidas}</td><td class="num">${c.omitidas}</td></tr>`)
        .join("")}</tbody></table></div>`;
    }
    if (t.id === "API" && newman.ejecutado) {
      extra = `<p class="nota">Colección <code>postman/collections/SGI-SEGANDINA</code> contra ${esc(newman.baseUrl)}, modo ${newman.completo ? "completo (con escrituras)" : "solo lectura (Login y consultas)"}.</p>`;
    }
    if (t.id === "API" && !newman.ejecutado) extra = `<p class="nota">${esc(newman.motivo)}</p>`;
    if (["E2E", "VAL", "SEG", "USA"].includes(t.id) && !playwright.ejecutado) extra = `<p class="nota">${esc(playwright.motivo)}</p>`;
    return `<section class="seccion-tipo" id="tipo-${t.id}"><p class="nota encabezado-seccion">Sección ${TIPOS.indexOf(t) + 1} · ${esc(t.herramienta)}</p><h2>${esc(t.nombre)}</h2>${extra}${delTipo.map(tarjetaCaso).join("\n")}</section>`;
  }).join("\n");

  const sesionesFallidas = playwright.ejecutado ? playwright.sesiones.filter((s) => s.estado === "fallida") : [];

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte de pruebas — SGI-SEGANDINA</title>
<style>${CSS}</style>
</head>
<body>
<main>
<section class="portada">
  <span class="logo">SA</span>
  <h1>Reporte de pruebas integrales</h1>
  <p>Sistema Web Interno de Gestión de Incidencias y Análisis de Seguridad — Seguridad Andina S.A.C.</p>
  <dl>
    <dt>Proyecto</dt><dd>SGI-SEGANDINA</dd>
    <dt>Curso</dt><dd>Integrador I — Universidad Tecnológica del Perú (UTP)</dd>
    <dt>Fecha de ejecución</dt><dd>${esc(FORMATO_FECHA.format(fechaEjecucion))} (hora de Lima)</dd>
    <dt>Reporte generado</dt><dd>${esc(FORMATO_FECHA.format(fechaGeneracion))}</dd>
    <dt>Rama y commit</dt><dd>${esc(git("rev-parse --abbrev-ref HEAD"))} · ${esc(git("rev-parse --short HEAD"))}</dd>
    <dt>Resultado</dt><dd>${total("aprobadas")} pruebas aprobadas, ${total("fallidas")} fallidas y ${total("omitidas")} omitidas</dd>
  </dl>
</section>

<nav class="tarjeta indice" aria-label="Índice">
  <h2 style="margin-top:0">Índice</h2>
  <ol>
    <li><a href="#resumen">Resumen por tipo de prueba</a></li>
    <li><a href="#reportes">Reportes detallados</a></li>
    ${casosFallidos.length ? `<li><a href="#fallidos">Casos fallidos</a></li>` : ""}
    ${TIPOS.filter((t) => casos.some((c) => c.tipo === t.id)).map((t) => `<li><a href="#tipo-${t.id}">${esc(t.nombre)}</a> — ${casos.filter((c) => c.tipo === t.id).map((c) => c.id).join(", ")}</li>`).join("")}
  </ol>
</nav>

<section id="resumen">
  <p class="nota encabezado-seccion">Resultados de la corrida</p>
  <h2>Resumen por tipo de prueba</h2>
  <div class="metricas">
    <div class="metrica"><b>${total("aprobadas")}</b>pruebas aprobadas</div>
    <div class="metrica ${total("fallidas") ? "mal" : ""}"><b>${total("fallidas")}</b>pruebas fallidas</div>
    <div class="metrica"><b>${total("omitidas")}</b>pruebas omitidas</div>
    <div class="metrica"><b>${casos.filter((c) => c.estado === ESTADO.APROBADO).length} / ${casos.length}</b>casos aprobados</div>
    ${jacoco ? `<div class="metrica"><b>${jacoco.instrucciones.toFixed(1)} %</b>cobertura del backend (instrucciones)</div>` : ""}
  </div>
  <div class="tarjeta">
    <table>
      <thead><tr><th>Tipo</th><th>Herramienta</th><th class="num">Aprobadas</th><th class="num">Fallidas</th><th class="num">Omitidas</th><th class="num">Casos aprobados</th><th class="num">Casos fallidos</th><th class="num">Casos sin ejecutar</th></tr></thead>
      <tbody>${filas
        .map((f) => `<tr><td>${esc(f.nombre)}${f.ejecutado ? "" : ' <span class="estado no-ejecutado">No ejecutado</span>'}</td><td>${esc(f.herramienta)}</td><td class="num">${f.aprobadas}</td><td class="num">${f.fallidas}</td><td class="num">${f.omitidas}</td><td class="num">${f.casosAprobados}</td><td class="num">${f.casosFallidos}</td><td class="num">${f.casosNoEjecutados}</td></tr>`)
        .join("")}</tbody>
    </table>
    <p class="nota">"Pruebas" son tests individuales (JUnit, peticiones de la colección y tests de Playwright); un caso <code>CP-xx</code> del plan puede agrupar varias. Un caso queda Fallido si cualquiera de sus pruebas falla y "No ejecutado" si todas se omitieron. Los pasos manuales de cada caso (consultas SQL, celular real, red lenta) no forman parte de este reporte.</p>
    ${sesionesFallidas.length ? `<p class="error">No se pudo preparar la sesión de: ${sesionesFallidas.map((s) => esc(s.titulo)).join(", ")}. ${sesionesFallidas.map((s) => esc(s.error || "")).join(" ")}</p>` : ""}
  </div>
</section>

<section id="reportes">
  <h2>Reportes detallados</h2>
  <div class="tarjeta">
    <ul class="enlaces">
      ${enlaceReporte("Surefire (backend)", RUTAS.surefireHtml, "resultado de cada test JUnit")}
      ${enlaceReporte("JaCoCo (cobertura)", RUTAS.jacocoHtml, "cobertura por paquete y clase")}
      ${enlaceReporte("Newman htmlextra (API)", RUTAS.newmanHtml, "cada petición con sus aserciones")}
      ${enlaceReporte("Playwright (frontend)", RUTAS.playwrightHtml, "cada prueba con sus pasos y capturas")}
    </ul>
    <p class="nota">Los reportes detallados se generan en cada máquina al correr las pruebas y no se versionan; este índice, las capturas y el PDF sí.</p>
  </div>
</section>

${casosFallidos.length ? `<section id="fallidos"><h2>Casos fallidos</h2><div class="tarjeta"><table><thead><tr><th>Caso</th><th>RF</th><th>Descripción</th><th>Resultado obtenido</th></tr></thead><tbody>${casosFallidos.map((c) => `<tr><td><a href="#${esc(c.id)}">${esc(c.id)}</a></td><td>${esc(c.rf)}</td><td>${esc(c.descripcion)}</td><td class="error">${esc(c.detalleObtenido)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}

${secciones}
</main>
</body>
</html>
`;
}

// ---------------------------------------------------------------- PDF y control de secretos

async function generarPdf() {
  const { chromium } = await import("playwright");
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    await pagina.goto(pathToFileURL(ARCHIVO_HTML).href, { waitUntil: "load" });
    await pagina.emulateMedia({ media: "print" });
    await pagina.pdf({
      path: ARCHIVO_PDF,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      outline: true,
      tagged: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        '<div style="width:100%;font:8px Segoe UI,Arial,sans-serif;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between"><span>SGI-SEGANDINA · Reporte de pruebas integrales</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>',
    });
  } finally {
    await navegador.close();
  }
}

/** Busca contraseñas, DNIs de prueba y tokens en los archivos generados. */
function controlarSecretos() {
  const secretos = Object.entries(process.env)
    .filter(([clave, valor]) => valor && valor.length >= 4 && (/^E2E_.*_(PASSWORD|DNI)$/.test(clave) || clave === "PRUEBAS_CONTRASENA_TEMPORAL"))
    .map(([clave, valor]) => ({ clave, valor }));
  const jwt = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

  const revisar = (archivo) => {
    if (!existsSync(archivo)) return [];
    const texto = readFileSync(archivo, "utf8");
    const hallados = secretos.filter((s) => texto.includes(s.valor)).map((s) => s.clave);
    if (jwt.test(texto)) hallados.push("token JWT");
    return hallados;
  };

  const versionados = revisar(ARCHIVO_HTML);
  const locales = [RUTAS.newmanHtml, RUTAS.playwrightHtml, RUTAS.newmanJson, RUTAS.playwrightJson]
    .map((archivo) => ({ archivo, hallados: revisar(archivo) }))
    .filter((r) => r.hallados.length);

  if (!secretos.length) console.log("Control de secretos: no hay variables E2E_* definidas; solo se buscaron tokens JWT.");
  for (const r of locales) console.warn(`AVISO: ${relative(RAIZ, r.archivo)} contiene ${r.hallados.join(", ")}. No lo compartas (está fuera de git).`);
  if (versionados.length) {
    console.error(`ERROR: index.html contiene ${versionados.join(", ")}. No se generó el PDF; revisa las pruebas antes de versionar.`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- principal

const surefire = leerSurefire();
const jacoco = surefire.ejecutado ? leerJacoco() : null;
const newman = leerNewman();
const playwright = leerPlaywright();
const casos = consolidar(surefire, jacoco, newman, playwright);
const filas = resumenPorTipo(casos, surefire, newman, playwright);
const fechaGeneracion = new Date();

mkdirSync(DIR_EVIDENCIAS, { recursive: true });
writeFileSync(ARCHIVO_HTML, generarHtml({ casos, filas, surefire, jacoco, newman, playwright, fechaGeneracion }), "utf8");
mkdirSync(DIR_REPORTES, { recursive: true });
writeFileSync(
  join(DIR_REPORTES, "resumen-casos.json"),
  JSON.stringify({ generado: fechaGeneracion.toISOString(), tipos: filas, casos: casos.map(({ id, rf, tipo, estado, detalleObtenido, capturas, pruebas }) => ({ id, rf, tipo, estado, detalleObtenido, capturas, pruebas })) }, null, 2),
  "utf8",
);
console.log(`Índice: ${relative(RAIZ, ARCHIVO_HTML)}`);

for (const f of filas) console.log(`  ${f.nombre.padEnd(36)} aprobadas ${String(f.aprobadas).padStart(4)} · fallidas ${String(f.fallidas).padStart(3)} · omitidas ${String(f.omitidas).padStart(3)}${f.ejecutado ? "" : "  (no ejecutado)"}`);
const fallidos = casos.filter((c) => c.estado === ESTADO.FALLIDO).map((c) => c.id);
if (fallidos.length) console.log(`  Casos fallidos: ${fallidos.join(", ")}`);

const limpio = controlarSecretos();
if (!limpio) process.exit(3);

if (!process.argv.includes("--sin-pdf")) {
  await generarPdf();
  console.log(`PDF: ${relative(RAIZ, ARCHIVO_PDF)}`);
}
process.exit(filas.some((f) => f.fallidas) ? 1 : 0);
