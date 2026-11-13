"use client";

import { Doughnut } from "react-chartjs-2";
import type { Conteo } from "@/lib/tipos";
import { PALETA_CATEGORIAS } from "./registro";
import TablaAccesible from "./TablaAccesible";

interface Props {
  titulo: string;
  datos: Conteo[];
}

/** Anillo (incidencias por tipo de evento) con leyenda y porcentaje en el tooltip. */
export default function GraficoAnillo({ titulo, datos }: Props) {
  const total = datos.reduce((suma, d) => suma + d.total, 0);
  return (
    <div>
      <div className="h-72" role="img" aria-label={`${titulo}: ${datos.map((d) => `${d.nombre} ${d.total}`).join(", ")}`}>
        <Doughnut
          data={{
            labels: datos.map((d) => d.nombre),
            datasets: [
              {
                data: datos.map((d) => d.total),
                backgroundColor: datos.map((_, i) => PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length]),
                borderColor: "#ffffff",
                borderWidth: 2,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: "60%",
            plugins: {
              legend: { position: "bottom", labels: { boxWidth: 12, padding: 12 } },
              tooltip: {
                callbacks: {
                  label: (item) => {
                    const valor = Number(item.raw);
                    const porcentaje = total ? Math.round((valor / total) * 100) : 0;
                    return ` ${item.label}: ${valor} (${porcentaje} %)`;
                  },
                },
              },
            },
          }}
        />
      </div>
      <TablaAccesible
        titulo={titulo}
        columnas={["Tipo de evento", "Incidencias"]}
        filas={datos.map((d) => ({ etiqueta: d.nombre, valor: d.total }))}
      />
    </div>
  );
}
