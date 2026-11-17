// Texto de la comparación de un periodo con el anterior (RF-05). Solo formatea: los dos conteos los da la API.

export type Tendencia = "sube" | "baja" | "igual" | "sinBase";

export interface Comparacion {
  tendencia: Tendencia;
  /** Por ejemplo "▲ 25 % vs. periodo anterior" o "Sin incidencias en el periodo anterior". */
  texto: string;
}

/**
 * Compara las incidencias del periodo con las del periodo anterior del mismo largo.
 *
 * @param actual incidencias del periodo consultado
 * @param anterior incidencias del periodo anterior
 * @return tendencia y texto; el porcentaje se redondea a entero
 */
export function compararConAnterior(actual: number, anterior: number): Comparacion {
  if (anterior === 0) {
    return actual === 0
      ? { tendencia: "igual", texto: "= 0 % vs. periodo anterior" }
      : { tendencia: "sinBase", texto: "▲ Sin incidencias en el periodo anterior" };
  }
  const porcentaje = Math.round(((actual - anterior) / anterior) * 100);
  if (porcentaje === 0) return { tendencia: "igual", texto: "= 0 % vs. periodo anterior" };
  return porcentaje > 0
    ? { tendencia: "sube", texto: `▲ ${porcentaje} % vs. periodo anterior` }
    : { tendencia: "baja", texto: `▼ ${Math.abs(porcentaje)} % vs. periodo anterior` };
}
