// Registro de Chart.js: solo los elementos que usan los gráficos del dashboard (barras, anillo y línea).

import {
  type ActiveElement,
  type ChartEvent,
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

Chart.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);
Chart.defaults.font.family = "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif";
Chart.defaults.color = "#475569"; // slate-600

/** Azul marino corporativo (blue-900). */
export const AZUL_MARINO = "#1c398e";

/**
 * Colores del anillo por tipo de evento: azules y pizarra de la paleta corporativa, en orden de contraste. Se
 * repiten si hay más tipos que colores. El rojo queda reservado para alertas y la gravedad.
 */
export const PALETA_CATEGORIAS = [
  "#1c398e", // blue-900
  "#3b82f6", // blue-500
  "#64748b", // slate-500
  "#93c5fd", // blue-300
  "#0f766e", // teal-700
  "#334155", // slate-700
  "#a5b4fc", // indigo-300
  "#cbd5e1", // slate-300
];

/** Ejes con números enteros (las incidencias no tienen decimales). */
export const EJE_ENTERO = { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#e2e8f0" } } as const;

/** Color hex con transparencia, para atenuar lo que no está elegido en el filtrado cruzado. */
export function atenuar(hex: string, alfa = 0.25): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

/** Índice del primer elemento bajo el puntero en un evento de Chart.js, o `null` si no hay ninguno. */
export function indiceElegido(elementos: ActiveElement[]): number | null {
  return elementos.length > 0 ? elementos[0].index : null;
}

/** `onHover` de los gráficos que filtran: mano sobre un elemento elegible, flecha en el resto. */
export function cursorElegible(evento: ChartEvent, elementos: ActiveElement[]) {
  const destino = evento.native?.target;
  if (destino instanceof HTMLElement) destino.style.cursor = elementos.length > 0 ? "pointer" : "default";
}
