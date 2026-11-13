"use client";

import { Bar, Line } from "react-chartjs-2";
import { etiquetaTramo, formatearDia } from "@/lib/fechas";
import type { SerieTiempo } from "@/lib/tipos";
import { AZUL_MARINO, EJE_ENTERO } from "./registro";
import TablaAccesible from "./TablaAccesible";

export type TipoSerie = "linea" | "barras";

interface Props {
  titulo: string;
  serie: SerieTiempo;
  tipo: TipoSerie;
}

/** Incidencias por tramo de tiempo (día, semana o mes), en línea o en barras. */
export default function GraficoSerie({ titulo, serie, tipo }: Props) {
  const etiquetas = serie.puntos.map((p) => etiquetaTramo(p, serie.agrupacion));
  const valores = serie.puntos.map((p) => p.total);
  const opciones = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // Tramo completo en el tooltip: "05/11/2026 al 11/11/2026".
          title: (items: { dataIndex: number }[]) => {
            const punto = serie.puntos[items[0]?.dataIndex ?? 0];
            if (!punto) return "";
            return punto.inicio === punto.fin
              ? formatearDia(punto.inicio)
              : `${formatearDia(punto.inicio)} al ${formatearDia(punto.fin)}`;
          },
        },
      },
    },
    scales: { y: EJE_ENTERO, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } } },
  };

  return (
    <div>
      <div className="h-72" role="img" aria-label={`${titulo}: ${serie.puntos.length} tramos, ${valores.reduce((a, b) => a + b, 0)} incidencias`}>
        {tipo === "linea" ? (
          <Line
            data={{
              labels: etiquetas,
              datasets: [
                {
                  label: "Incidencias",
                  data: valores,
                  borderColor: AZUL_MARINO,
                  backgroundColor: "rgba(28, 57, 142, 0.12)",
                  fill: true,
                  tension: 0.25,
                  pointRadius: serie.puntos.length > 40 ? 0 : 3,
                },
              ],
            }}
            options={opciones}
          />
        ) : (
          <Bar
            data={{
              labels: etiquetas,
              datasets: [
                { label: "Incidencias", data: valores, backgroundColor: AZUL_MARINO, borderRadius: 3, maxBarThickness: 40 },
              ],
            }}
            options={opciones}
          />
        )}
      </div>
      <TablaAccesible
        titulo={titulo}
        columnas={["Tramo", "Incidencias"]}
        filas={serie.puntos.map((p, i) => ({ etiqueta: etiquetas[i], valor: p.total }))}
      />
    </div>
  );
}
