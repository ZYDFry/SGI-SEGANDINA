"use client";

import { Bar } from "react-chartjs-2";
import type { Conteo } from "@/lib/tipos";
import { AZUL_MARINO, EJE_ENTERO, atenuar, indiceBarraBajoPuntero } from "./registro";
import TablaAccesible from "./TablaAccesible";

interface Props {
  titulo: string;
  datos: Conteo[];
  /** Id de la barra elegida: se resalta y las demás se atenúan. */
  seleccionado?: number | null;
  /** Clic en una barra (o en su fila de la tabla accesible) con el id de esa zona. */
  onElegir?: (id: number) => void;
  /** Clic en un espacio vacío del gráfico (junto a las barras o entre ellas): quita el filtro de este gráfico. */
  onQuitar?: () => void;
}

/**
 * Barras horizontales (incidencias por zona), de mayor a menor como las devuelve la API. El clic en una barra la elige;
 * el clic en el espacio en blanco a su derecha llama a `onQuitar`.
 */
export default function GraficoBarras({ titulo, datos, seleccionado = null, onElegir, onQuitar }: Props) {
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
            // El tooltip responde en toda la fila; el clic, desde el inicio hasta el extremo de la barra.
            interaction: { mode: "index", axis: "y", intersect: false },
            plugins: { legend: { display: false } },
            scales: { x: EJE_ENTERO, y: { grid: { display: false } } },
            onClick: onElegir
              ? (evento, elementos) => {
                  const i = indiceBarraBajoPuntero(evento, elementos);
                  if (i !== null && datos[i]) onElegir(datos[i].id);
                  else if (i === null && seleccionado !== null) onQuitar?.();
                }
              : undefined,
            onHover: onElegir
              ? (evento, elementos) => {
                  const destino = evento.native?.target;
                  if (destino instanceof HTMLElement) {
                    destino.style.cursor = indiceBarraBajoPuntero(evento, elementos) !== null ? "pointer" : "default";
                  }
                }
              : undefined,
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
