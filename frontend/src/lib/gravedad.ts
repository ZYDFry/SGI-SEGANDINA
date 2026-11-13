// Colores por orden de gravedad: 1 Baja verde, 2 Media amarillo, 3 Alta naranja, 4 Crítica rojo. Los usan el
// formulario de incidencias, el dashboard y el historial para que un nivel se vea igual en todas las pantallas.

interface ColoresNivel {
  /** Clases del botón sin marcar y marcado del selector rápido. */
  normal: string;
  marcada: string;
  /** Clases de la insignia de la tabla del historial. */
  insignia: string;
  /** Color para Chart.js y acentos (hex). */
  hex: string;
}

const COLORES: Record<number, ColoresNivel> = {
  1: {
    normal: "border-green-300 bg-green-50 text-green-800",
    marcada: "border-green-600 bg-green-600 text-white",
    insignia: "bg-green-100 text-green-800 ring-green-600/30",
    hex: "#16a34a",
  },
  2: {
    normal: "border-yellow-300 bg-yellow-50 text-yellow-800",
    marcada: "border-yellow-400 bg-yellow-400 text-yellow-950",
    insignia: "bg-yellow-100 text-yellow-900 ring-yellow-500/40",
    hex: "#facc15",
  },
  3: {
    normal: "border-orange-300 bg-orange-50 text-orange-800",
    marcada: "border-orange-500 bg-orange-500 text-white",
    insignia: "bg-orange-100 text-orange-800 ring-orange-500/30",
    hex: "#f97316",
  },
  4: {
    normal: "border-red-300 bg-red-50 text-red-700",
    marcada: "border-red-600 bg-red-600 text-white",
    insignia: "bg-red-100 text-red-700 ring-red-600/30",
    hex: "#dc2626",
  },
};

/** Colores del nivel según su `orden` (1 = menos grave); un orden mayor a 4 usa el de Crítica. */
export function coloresGravedad(orden: number): ColoresNivel {
  return COLORES[orden] ?? COLORES[4];
}
