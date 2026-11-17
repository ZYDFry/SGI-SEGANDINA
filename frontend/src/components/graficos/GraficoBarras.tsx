"use client";

import { Bar } from "react-chartjs-2";
import type { Conteo } from "@/lib/tipos";
import { AZUL_MARINO, EJE_ENTERO, atenuar, cursorElegible, indiceElegido } from "./registro";
import TablaAccesible from "./TablaAccesible";

interface Props {
  titulo: string;
  datos: Conteo[];
  /** Id de la barra elegida: se resalta y las demás se atenúan. */
  seleccionado?: number | null;
  /** Clic en una barra (o en su fila de la tabla accesible) con el id de esa zona. */
  onElegir?: (id: number) => void;
}

/** Barras horizontales (incidencias por zona), de mayor a menor como las devuelve la API. */
export default function GraficoBarras({ titulo, datos, seleccionado = null, onElegir }: Props) {
  // Alto según la cantidad de barras para que los nombres de zona se lean completos.
  const alto = Math.max(220, datos.length * 34 + 40);
  const elegido = seleccionado !== null ? datos.find((d) => d.id === seleccionado) : undefined;
  return (
    <div>
      <div
        style={{ height: alto }}
        role="img"
        aria-label={`${titulo}: ${datos.map((d) => `${d.nombre} ${d.total}`).join(", ")}${elegido ? `. Elegida: ${elegido.nombre}` : ""}`}
      >
        <Bar
          data={{
            labels: datos.map((d) => d.nombre),
            datasets: [
              {
                label: "Incidencias",
                data: datos.map((d) => d.total),
                backgroundColor: datos.map((d) =>
                  seleccionado === null || d.id === seleccionado ? AZUL_MARINO : atenuar(AZUL_MARINO),
                ),
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
            // Toda la fila de la zona responde al clic y al tooltip, no solo la barra.
            interaction: { mode: "index", axis: "y", intersect: false },
            plugins: { legend: { display: false } },
            scales: { x: EJE_ENTERO, y: { grid: { display: false } } },
            onClick: onElegir
              ? (_evento, elementos) => {
                  const i = indiceElegido(elementos);
                  if (i !== null && datos[i]) onElegir(datos[i].id);
                }
              : undefined,
            onHover: onElegir ? cursorElegible : undefined,
          }}
        />
      </div>
      <TablaAccesible
        titulo={titulo}
        columnas={["Zona", "Incidencias"]}
        filas={datos.map((d) => ({ id: d.id, etiqueta: d.nombre, valor: d.total }))}
        seleccionado={seleccionado}
        onElegir={onElegir}
      />
    </div>
  );
}
