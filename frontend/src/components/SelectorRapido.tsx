"use client";

import type { FocusEvent } from "react";
import MensajeCampo from "@/components/MensajeCampo";
import { idError } from "@/lib/useValidacion";

export interface OpcionSelector {
  valor: number;
  etiqueta: string;
  /** Clases de Tailwind para la opción sin marcar y marcada (p. ej. colores de gravedad). */
  clases?: { normal: string; marcada: string };
}

interface Props {
  titulo: string;
  opciones: OpcionSelector[];
  valor: number | null;
  onCambio: (valor: number) => void;
  columnas?: 2 | 3 | 4;
  /** Nombre del campo: id del grupo y del aviso (`error-<campo>`). */
  campo?: string;
  /** Aviso a mostrar debajo del grupo. */
  error?: string;
  /** Se llama cuando el foco sale del grupo (no al pasar de un botón a otro). */
  onSalir?: () => void;
  /** Ref del primer botón, para enfocarlo si el grupo es el primer campo con error. */
  refPrimero?: (elemento: HTMLElement | null) => void;
}

const CLASES_POR_DEFECTO = {
  normal: "border-slate-300 bg-white text-slate-700",
  marcada: "border-blue-900 bg-blue-900 text-white",
};

const GRILLA = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" } as const;

/** Grupo de botones grandes que funciona como un radio: pensado para tocar con el pulgar. */
export default function SelectorRapido({
  titulo,
  opciones,
  valor,
  onCambio,
  columnas = 2,
  campo,
  error,
  onSalir,
  refPrimero,
}: Props) {
  function alSalirDelGrupo(evento: FocusEvent<HTMLFieldSetElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) onSalir?.();
  }

  return (
    <fieldset onBlur={alSalirDelGrupo}>
      <legend className="mb-2 text-sm font-semibold text-slate-700">{titulo}</legend>
      <div
        id={campo}
        role="radiogroup"
        aria-label={titulo}
        aria-invalid={!!error}
        aria-describedby={error && campo ? idError(campo) : undefined}
        className={`grid gap-2 rounded-lg ${GRILLA[columnas]} ${error ? "outline-2 outline-offset-2 outline-red-500" : ""}`}
      >
        {opciones.map((opcion, indice) => {
          const marcada = opcion.valor === valor;
          const clases = opcion.clases ?? CLASES_POR_DEFECTO;
          return (
            <button
              key={opcion.valor}
              ref={indice === 0 ? refPrimero : undefined}
              type="button"
              role="radio"
              aria-checked={marcada}
              onClick={() => onCambio(opcion.valor)}
              className={`min-h-12 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 ${
                marcada ? `${clases.marcada} shadow-md` : clases.normal
              }`}
            >
              {marcada && <span aria-hidden="true">✓ </span>}
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>
      {campo && <MensajeCampo campo={campo} mensaje={error} />}
    </fieldset>
  );
}
