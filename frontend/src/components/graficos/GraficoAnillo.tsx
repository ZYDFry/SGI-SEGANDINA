"use client";

import { Doughnut } from "react-chartjs-2";
import type { Conteo } from "@/lib/tipos";
import { PALETA_CATEGORIAS, atenuar, cursorElegible, enAreaDeDibujo, indiceElegido } from "./registro";
import TablaAccesible from "./TablaAccesible";

interface Props {
  titulo: string;
  datos: Conteo[];
  /** Id del sector elegido: se resalta y los demás se atenúan. */
  seleccionado?: number | null;
  /** Clic en un sector, en su leyenda o en su fila de la tabla accesible, con el id del tipo de evento. */
  onElegir?: (id: number) => void;
  /** Clic en un espacio vacío del gráfico (el centro del anillo o las esquinas): quita el filtro de este gráfico. */
  onQuitar?: () => void;
}

/** Anillo (incidencias por tipo de evento) con leyenda y porcentaje en el tooltip. */
export default function GraficoAnillo({ titulo, datos, seleccionado = null, onElegir, onQuitar }: Props) {
  const total = datos.reduce((suma, d) => suma + d.total, 0);
  const colores = datos.map((d, i) => {
    const base = PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length];
    return seleccionado === null || d.id === seleccionado ? base : atenuar(base);
  });
  const elegido = seleccionado !== null ? datos.find((d) => d.id === seleccionado) : undefined;
  return (
    <div>
      <div
        className="h-72"
        role="img"
        aria-label={`${titulo}: ${datos.map((d) => `${d.nombre} ${d.total}`).join(", ")}${elegido ? `. Elegido: ${elegido.nombre}` : ""}`}
      >
        <Doughnut
          data={{
            labels: datos.map((d) => d.nombre),
            datasets: [
              {
                data: datos.map((d) => d.total),
                backgroundColor: colores,
                borderColor: "#ffffff",
                borderWidth: 2,
                // El sector elegido sobresale un poco.
                offset: datos.map((d) => (d.id === seleccionado ? 8 : 0)),
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: "60%",
            layout: { padding: 8 },
            onClick: onElegir
              ? (evento, elementos, grafico) => {
                  const i = indiceElegido(elementos);
                  if (i !== null && datos[i]) onElegir(datos[i].id);
                  // Vacío: centro o esquinas del área del anillo (la leyenda tiene su propio clic).
                  else if (i === null && seleccionado !== null && enAreaDeDibujo(evento, grafico)) onQuitar?.();
                }
              : undefined,
            onHover: onElegir ? cursorElegible : undefined,
            plugins: {
              legend: {
                position: "bottom",
                labels: { boxWidth: 12, padding: 12 },
                // Con filtrado cruzado la leyenda filtra como el sector, en lugar de ocultarlo.
                ...(onElegir
                  ? {
                      onClick: (_evento, item) => {
                        const d = item.index !== undefined ? datos[item.index] : undefined;
                        if (d) onElegir(d.id);
                      },
                    }
                  : {}),
              },
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
        filas={datos.map((d) => ({ id: d.id, etiqueta: d.nombre, valor: d.total }))}
        seleccionado={seleccionado}
        onElegir={onElegir}
      />
    </div>
  );
}
