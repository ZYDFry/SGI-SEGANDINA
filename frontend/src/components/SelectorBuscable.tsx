"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import { idError } from "@/lib/useValidacion";

export interface OpcionBuscable {
  valor: number;
  etiqueta: string;
  /** Texto secundario que también se busca (p. ej. "Miraflores, Lima"). */
  detalle?: string;
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
}

/** Minúsculas y sin tildes, para buscar "san martin" y encontrar "San Martín". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Desplegable con búsqueda para listas que crecen (zonas). Un botón grande muestra la opción elegida; al tocarlo
 * abre una hoja inferior en el celular (o un desplegable desde tablet) con un buscador por nombre y detalle y la lista
 * desplazable. Se maneja con el pulgar o con el teclado (↑/↓, Enter, Escape) y muestra el aviso debajo del botón.
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
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0);
  const boton = useRef<HTMLButtonElement | null>(null);
  const buscador = useRef<HTMLInputElement | null>(null);
  const abiertoRef = useRef(false);
  const base = useId();
  const idLista = `${base}-lista`;
  const idOpcion = (indice: number) => `${base}-opcion-${indice}`;

  const elegida = opciones.find((o) => o.valor === valor);
  const consulta = normalizar(busqueda.trim());
  const ordenadas =
    destacado === null
      ? opciones
      : [...opciones.filter((o) => o.valor === destacado), ...opciones.filter((o) => o.valor !== destacado)];
  const visibles = consulta
    ? ordenadas.filter((o) => normalizar(`${o.etiqueta} ${o.detalle ?? ""}`).includes(consulta))
    : ordenadas;

  useEffect(() => {
    if (abierto) buscador.current?.focus();
  }, [abierto]);

  function abrir() {
    const indiceElegida = ordenadas.findIndex((o) => o.valor === valor);
    setBusqueda("");
    setActivo(Math.max(indiceElegida, 0));
    abiertoRef.current = true;
    setAbierto(true);
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

  function mover(indice: number) {
    setActivo(indice);
    requestAnimationFrame(() => document.getElementById(idOpcion(indice))?.scrollIntoView({ block: "nearest" }));
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      if (visibles.length) mover(Math.min(activo + 1, visibles.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      if (visibles.length) mover(Math.max(activo - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (visibles[activo]) elegir(visibles[activo]);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      cerrar();
    }
  }

  return (
    <div>
      <p id={`${base}-titulo`} className="mb-2 text-sm font-semibold text-slate-700">
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
          aria-labelledby={`${base}-titulo ${campo}`}
          aria-describedby={error ? idError(campo) : undefined}
          onClick={abierto ? cerrar : abrir}
          onBlur={() => {
            if (!abiertoRef.current) onSalir?.();
          }}
          className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border-2 bg-white px-3 py-2 text-left outline-none focus:ring-4 ${bordeCampo(!!error)}`}
        >
          <span className="min-w-0">
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
            <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-white shadow-2xl sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:mt-1 sm:max-h-80 sm:rounded-xl sm:border sm:border-slate-200">
              <div className="flex items-center justify-between px-4 pt-3 sm:hidden">
                <span className="text-base font-bold text-blue-900">{titulo}</span>
                <button type="button" onClick={cerrar} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">
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
                  placeholder="Buscar por nombre o distrito…"
                  autoComplete="off"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setActivo(0);
                  }}
                  onKeyDown={alTeclear}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20"
                />
              </div>
              <ul id={idLista} role="listbox" aria-label={titulo} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {visibles.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-slate-500">Sin resultados para “{busqueda.trim()}”.</li>
                )}
                {visibles.map((opcion, indice) => {
                  const marcada = opcion.valor === valor;
                  return (
                    <li
                      key={opcion.valor}
                      id={idOpcion(indice)}
                      role="option"
                      aria-selected={marcada}
                      onClick={() => elegir(opcion)}
                      onMouseMove={() => indice !== activo && setActivo(indice)}
                      className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                        indice === activo ? "bg-blue-50" : ""
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
