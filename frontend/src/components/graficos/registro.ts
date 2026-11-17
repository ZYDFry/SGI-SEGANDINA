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

/** Si el evento cae dentro del área de dibujo del gráfico (sin ejes ni leyenda). */
export function enAreaDeDibujo(evento: ChartEvent, grafico: Chart): boolean {
  const { x, y } = evento;
  const area = grafico.chartArea;
  return x !== null && y !== null && x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
}

/** Ancho mínimo (px) que responde al clic en una barra horizontal, para que las barras cortas se puedan elegir. */
const ANCHO_MINIMO_BARRA = 24;

/**
 * Índice de la barra horizontal bajo el puntero. Responde la fila de la barra desde su inicio hasta su extremo (al
 * menos 24 px); el espacio en blanco a la derecha de la barra no es ninguna, y sirve para quitar el filtro con un
 * clic en una zona vacía. Chart.js solo avisa clics dentro del área de dibujo (no en los nombres del eje).
 *
 * @param evento evento de Chart.js (clic o movimiento)
 * @param elementos elementos activos de la fila (interacción `mode: "index", axis: "y"`)
 * @return índice de la barra, o `null` si el puntero está en un espacio vacío
 */
export function indiceBarraBajoPuntero(evento: ChartEvent, elementos: ActiveElement[]): number | null {
  if (elementos.length === 0 || evento.x === null) return null;
  const { index, element } = elementos[0];
  const { x: fin, base } = element.getProps(["x", "base"], true) as { x: number; base: number };
  return evento.x <= Math.max(fin, base + ANCHO_MINIMO_BARRA) ? index : null;
}
