"use client";

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
}

const CLASES_POR_DEFECTO = {
  normal: "border-slate-300 bg-white text-slate-700",
  marcada: "border-blue-900 bg-blue-900 text-white",
};

const GRILLA = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" } as const;

/** Grupo de botones grandes que funciona como un radio: pensado para tocar con el pulgar. */
export default function SelectorRapido({ titulo, opciones, valor, onCambio, columnas = 2 }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-700">{titulo}</legend>
      <div role="radiogroup" aria-label={titulo} className={`grid gap-2 ${GRILLA[columnas]}`}>
        {opciones.map((opcion) => {
          const marcada = opcion.valor === valor;
          const clases = opcion.clases ?? CLASES_POR_DEFECTO;
          return (
            <button
              key={opcion.valor}
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
    </fieldset>
  );
}
