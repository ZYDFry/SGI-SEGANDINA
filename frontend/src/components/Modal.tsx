"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  titulo: string;
  /** Texto bajo el título (p. ej. el nombre del usuario sobre el que se actúa). */
  subtitulo?: string;
  onCerrar: () => void;
  /** Mientras es `true` (p. ej. guardando), Escape y el fondo no cierran el diálogo. */
  bloqueado?: boolean;
  /** Ancho máximo desde tablet; en el celular ocupa toda la pantalla. */
  ancho?: "sm" | "md" | "lg";
  children: ReactNode;
}

const ANCHOS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
} as const;
const ENFOCABLES = "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";

/**
 * Diálogo modal accesible: `role="dialog"` con `aria-modal` y título enlazado, foco en el primer campo al abrir,
 * cierre con Escape, con "✕" o tocando el fondo, y foco devuelto al elemento que lo abrió. En el celular ocupa la
 * pantalla; desde tablet es una tarjeta centrada con desplazamiento interno.
 */
export default function Modal({ titulo, subtitulo, onCerrar, bloqueado = false, ancho = "md", children }: Props) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement | null>(null);
  const cerrar = useRef(onCerrar);
  const bloqueadoRef = useRef(bloqueado);

  useEffect(() => {
    cerrar.current = onCerrar;
    bloqueadoRef.current = bloqueado;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    // El primer campo del cuerpo (se salta el botón "✕" del encabezado).
    const primero = panel.current?.querySelector<HTMLElement>(`[data-cuerpo] :is(${ENFOCABLES})`);
    (primero ?? panel.current)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bloqueadoRef.current) cerrar.current();
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={() => !bloqueado && onCerrar()}
        className="absolute inset-0 bg-slate-900/50"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`relative flex max-h-full w-full flex-col bg-white shadow-xl focus:outline-none sm:max-h-[90vh] sm:rounded-2xl ${ANCHOS[ancho]}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-lg font-bold text-blue-900">
              {titulo}
            </h2>
            {subtitulo && <p className="truncate text-sm text-slate-500">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={bloqueado}
            aria-label="Cerrar"
            className="shrink-0 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            ✕
          </button>
        </div>
        <div data-cuerpo className="overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
