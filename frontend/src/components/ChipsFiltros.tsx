"use client";

import { PERIODOS } from "@/components/SelectorPeriodo";
import { formatearDia } from "@/lib/fechas";
import { DIMENSIONES, FILTRO_INICIAL, sinFiltro, type ClaveDimension } from "@/lib/filtrosUrl";
import type { Catalogos } from "@/lib/servicios";
import type { FiltroIncidencias } from "@/lib/tipos";

interface Props {
  filtro: FiltroIncidencias;
  /** Catálogos activos para mostrar los nombres; sin ellos (o con un id inactivo) se muestra "Zona n.° 7". */
  catalogos: Catalogos | null;
  onCambio: (filtro: FiltroIncidencias) => void;
}

/** Nombre del elemento elegido en una dimensión, según los catálogos. */
function nombreDe(clave: ClaveDimension, id: number, catalogos: Catalogos | null): string | undefined {
  if (!catalogos) return undefined;
  switch (clave) {
    case "idZona":
      return catalogos.zonas.find((z) => z.idZona === id)?.nombreZona;
    case "idTipoEvento":
      return catalogos.tipos.find((t) => t.idTipoEvento === id)?.nombreTipoEvento;
    case "idNivelGravedad":
      return catalogos.niveles.find((n) => n.idNivelGravedad === id)?.nombreNivel;
  }
}

/**
 * Chips de los filtros activos con "×" para quitar cada uno y "Quitar todo" para volver a los últimos 30 días sin
 * filtros. El periodo solo aparece si no es el de defecto. No muestra nada si no hay filtros.
 */
export default function ChipsFiltros({ filtro, catalogos, onCambio }: Props) {
  const chips: { id: string; texto: string; quitar: () => void }[] = [];

  if (filtro.periodo !== FILTRO_INICIAL.periodo) {
    const etiqueta = PERIODOS.find((p) => p.valor === filtro.periodo)?.etiqueta ?? filtro.periodo;
    chips.push({
      id: "periodo",
      texto:
        filtro.periodo === "PERSONALIZADO" && filtro.desde && filtro.hasta
          ? `Periodo: ${formatearDia(filtro.desde)} al ${formatearDia(filtro.hasta)}`
          : `Periodo: ${etiqueta}`,
      quitar: () => onCambio({ ...filtro, periodo: FILTRO_INICIAL.periodo, desde: undefined, hasta: undefined }),
    });
  }
  for (const { clave, etiqueta } of DIMENSIONES) {
    const id = filtro[clave];
    if (id === null) continue;
    chips.push({
      id: clave,
      texto: `${etiqueta}: ${nombreDe(clave, id, catalogos) ?? `n.° ${id}`}`,
      quitar: () => onCambio(sinFiltro(filtro, clave)),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos" role="group">
      {chips.map((chip) => (
        <span
          key={chip.id}
          data-chip={chip.id}
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-3 pr-1 text-sm font-medium text-blue-900 ring-1 ring-blue-200"
        >
          {chip.texto}
          <button
            type="button"
            onClick={chip.quitar}
            aria-label={`Quitar filtro ${chip.texto}`}
            className="flex h-6 w-6 items-center justify-center rounded-full text-base leading-none hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-900"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onCambio(FILTRO_INICIAL)}
        className="px-1 py-1 text-sm font-semibold text-blue-900 underline"
      >
        Quitar todo
      </button>
    </div>
  );
}
