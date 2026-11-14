"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import { idError } from "@/lib/useValidacion";

export interface OpcionBuscable {
  valor: number;
  etiqueta: string;
  /** Segunda línea, más pequeña, que también se busca (p. ej. el distrito). */
  detalle?: string;
  /** Texto que se busca pero no se muestra (p. ej. provincia y referencia de la zona). */
  busqueda?: string;
}

interface Props {
  titulo: string;
  opciones: OpcionBuscable[];
  valor: number | null;
  onCambio: (valor: number) => void;
  /** Texto del botón sin elección (p. ej. "Elige una zona"). */
  placeholder: string;
  /** Nombre del campo: id del botón y del aviso (`error-<campo>`). */
  campo: string;
  error?: string;
  /** Se llama al cerrar el panel o al salir del botón con el panel cerrado (marca el campo como tocado). */
  onSalir?: () => void;
  /** Ref del botón, para enfocarlo si es el primer campo con error. */
  refPrimero?: (elemento: HTMLElement | null) => void;
  /** Opción que se muestra primero con la marca "Tu zona" (p. ej. la zona asignada al vigilante). */
  destacado?: number | null;
  etiquetaDestacado?: string;
  /** Texto de ayuda del buscador. */
  placeholderBusqueda?: string;
}

/** Con más opciones que esto, la lista se limita en altura (unas 8 opciones de dos líneas) y se desplaza. */
export const MAX_OPCIONES_VISIBLES = 8;

/** Minúsculas y sin tildes, para buscar "san martin" y encontrar "San Martín". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Desplegable con búsqueda (patrón combobox de ARIA) para listas que crecen, como las zonas. Un botón grande muestra
 * la opción elegida; al tocarlo abre una hoja inferior en el celular (o un desplegable desde tablet) con un buscador
 * enfocado que filtra por etiqueta, detalle y `busqueda` sin distinguir mayúsculas ni tildes. Las opciones miden al
 * menos 48 px de alto; con más de {@link MAX_OPCIONES_VISIBLES} la lista se limita en altura y se desplaza.
 * Teclado: ↑/↓, Inicio/Fin, Enter elige, Escape o Tab cierran. El número de resultados se anuncia al lector de
 * pantalla y el aviso de validación se muestra debajo del botón.
 */
export default function SelectorBuscable({
  titulo,
  opciones,
  valor,
  onCambio,
  placeholder,
  campo,
  error,
  onSalir,
  refPrimero,
  destacado = null,
  etiquetaDestacado = "Tu zona",
  placeholderBusqueda = "Buscar…",
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0);
  const boton = useRef<HTMLButtonElement | null>(null);
  const buscador = useRef<HTMLInputElement | null>(null);
  const abiertoRef = useRef(false);
  const base = useId();
  const idTitulo = `${base}-titulo`;
  const idValor = `${base}-valor`;
  const idLista = `${base}-lista`;
  const idOpcion = (indice: number) => `${base}-opcion-${indice}`;

  const elegida = opciones.find((o) => o.valor === valor);
  const consulta = normalizar(busqueda.trim());
  const ordenadas =
    destacado === null
      ? opciones
      : [...opciones.filter((o) => o.valor === destacado), ...opciones.filter((o) => o.valor !== destacado)];
  const visibles = consulta
    ? ordenadas.filter((o) => normalizar(`${o.etiqueta} ${o.detalle ?? ""} ${o.busqueda ?? ""}`).includes(consulta))
    : ordenadas;
  const limitada = opciones.length > MAX_OPCIONES_VISIBLES;
  const anuncio = !abierto
    ? ""
    : visibles.length === 0
      ? "Sin coincidencias"
      : `${visibles.length} ${visibles.length === 1 ? "resultado" : "resultados"}`;

  useEffect(() => {
    if (abierto) buscador.current?.focus();
  }, [abierto]);

  function abrir() {
    const indiceElegida = ordenadas.findIndex((o) => o.valor === valor);
    setBusqueda("");
    setActivo(Math.max(indiceElegida, 0));
    abiertoRef.current = true;
    setAbierto(true);
    if (indiceElegida > 0) desplazarA(indiceElegida);
  }

  function cerrar() {
    abiertoRef.current = false;
    setAbierto(false);
    boton.current?.focus();
    onSalir?.();
  }

  function elegir(opcion: OpcionBuscable) {
    onCambio(opcion.valor);
    cerrar();
  }

  function desplazarA(indice: number) {
    requestAnimationFrame(() => document.getElementById(idOpcion(indice))?.scrollIntoView({ block: "nearest" }));
  }

  function mover(indice: number) {
    if (!visibles.length) return;
    const limitado = Math.min(Math.max(indice, 0), visibles.length - 1);
    setActivo(limitado);
    desplazarA(limitado);
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        mover(activo + 1);
        break;
      case "ArrowUp":
        evento.preventDefault();
        mover(activo - 1);
        break;
      case "Home":
        evento.preventDefault();
        mover(0);
        break;
      case "End":
        evento.preventDefault();
        mover(visibles.length - 1);
        break;
      case "Enter":
        evento.preventDefault();
        if (visibles[activo]) elegir(visibles[activo]);
        break;
      case "Escape":
      case "Tab":
        evento.preventDefault();
        cerrar();
        break;
    }
  }

  return (
    <div>
      <p id={idTitulo} className="mb-2 text-sm font-semibold text-slate-700">
        {titulo}
      </p>
      <div className="relative">
        <button
          ref={(elemento) => {
            boton.current = elemento;
            refPrimero?.(elemento);
          }}
          id={campo}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-controls={abierto ? idLista : undefined}
          aria-labelledby={`${idTitulo} ${idValor}`}
          aria-describedby={error ? idError(campo) : undefined}
          onClick={abierto ? cerrar : abrir}
          onBlur={() => {
            if (!abiertoRef.current) onSalir?.();
          }}
          className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border-2 bg-white px-3 py-2 text-left outline-none focus:ring-4 ${bordeCampo(!!error)}`}
        >
          <span id={idValor} className="min-w-0">
            {elegida ? (
              <>
                <span className="block truncate font-semibold text-slate-900">{elegida.etiqueta}</span>
                {elegida.detalle && <span className="block truncate text-xs text-slate-500">{elegida.detalle}</span>}
              </>
            ) : (
              <span className="text-slate-500">{placeholder}</span>
            )}
          </span>
          <span aria-hidden="true" className={`shrink-0 text-slate-500 transition-transform ${abierto ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>

        {/* Anuncia cuántas opciones quedan al filtrar (solo para lectores de pantalla). */}
        <p aria-live="polite" className="sr-only">
          {anuncio}
        </p>

        {abierto && (
          <>
            {/* Fondo: oscurece en el celular y cierra al tocar fuera en cualquier pantalla. */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Cerrar"
              onClick={cerrar}
              className="fixed inset-0 z-40 cursor-default bg-slate-900/50 sm:bg-transparent"
            />
            <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-white shadow-2xl sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:mt-1 sm:max-h-[32rem] sm:rounded-xl sm:border sm:border-slate-200">
              <div className="flex items-center justify-between px-4 pt-3 sm:hidden">
                <span className="text-base font-bold text-blue-900">{titulo}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Cerrar"
                  onClick={cerrar}
                  className="min-h-11 min-w-11 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <div className="p-3">
                <input
                  ref={buscador}
                  type="search"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={idLista}
                  aria-autocomplete="list"
                  aria-activedescendant={visibles[activo] ? idOpcion(activo) : undefined}
                  aria-label={`Buscar ${titulo.toLowerCase()}`}
                  placeholder={placeholderBusqueda}
                  autoComplete="off"
                  enterKeyHint="search"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setActivo(0);
                  }}
                  onKeyDown={alTeclear}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20"
                />
              </div>
              <ul
                id={idLista}
                role="listbox"
                aria-label={titulo}
                className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 ${limitada ? "max-h-[28rem]" : ""}`}
              >
                {visibles.length === 0 && (
                  <li role="presentation" className="px-3 py-6 text-center text-sm text-slate-500">
                    Sin coincidencias
                  </li>
                )}
                {visibles.map((opcion, indice) => {
                  const marcada = opcion.valor === valor;
                  const esActiva = indice === activo;
                  return (
                    <li
                      key={opcion.valor}
                      id={idOpcion(indice)}
                      role="option"
                      aria-selected={esActiva}
                      onClick={() => elegir(opcion)}
                      onMouseMove={() => !esActiva && setActivo(indice)}
                      className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                        esActiva ? "bg-blue-50" : ""
                      } ${marcada ? "text-blue-900" : "text-slate-800"}`}
                    >
                      <span className="min-w-0">
                        <span className={`block truncate ${marcada ? "font-bold" : "font-medium"}`}>
                          {opcion.etiqueta}
                          {opcion.valor === destacado && (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
                              {etiquetaDestacado}
                            </span>
                          )}
                          {marcada && <span className="sr-only"> (elegida)</span>}
                        </span>
                        {opcion.detalle && <span className="block truncate text-xs text-slate-500">{opcion.detalle}</span>}
                      </span>
                      {marcada && <span aria-hidden="true">✓</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
      <MensajeCampo campo={campo} mensaje={error} />
    </div>
  );
}
