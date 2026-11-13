"use client";

import { Bar } from "react-chartjs-2";
import type { Conteo } from "@/lib/tipos";
import { AZUL_MARINO, EJE_ENTERO } from "./registro";
import TablaAccesible from "./TablaAccesible";

interface Props {
  titulo: string;
  datos: Conteo[];
}

/** Barras horizontales (incidencias por zona), de mayor a menor como las devuelve la API. */
export default function GraficoBarras({ titulo, datos }: Props) {
  // Alto según la cantidad de barras para que los nombres de zona se lean completos.
  const alto = Math.max(220, datos.length * 34 + 40);
  return (
    <div>
      <div style={{ height: alto }} role="img" aria-label={`${titulo}: ${datos.map((d) => `${d.nombre} ${d.total}`).join(", ")}`}>
        <Bar
          data={{
            labels: datos.map((d) => d.nombre),
            datasets: [
              {
                label: "Incidencias",
                data: datos.map((d) => d.total),
                backgroundColor: AZUL_MARINO,
                borderRadius: 4,
                maxBarThickness: 26,
              },
            ],
          }}
          options={{
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: { x: EJE_ENTERO, y: { grid: { display: false } } },
          }}
        />
      </div>
      <TablaAccesible
        titulo={titulo}
        columnas={["Zona", "Incidencias"]}
        filas={datos.map((d) => ({ etiqueta: d.nombre, valor: d.total }))}
      />
    </div>
  );
}
