"use client";

import { PERIODOS } from "@/components/SelectorPeriodo";
import { formatearDia } from "@/lib/fechas";
import { DIMENSIONES, FILTRO_INICIAL, sinFiltro, type ClaveDimension } from "@/lib/filtrosUrl";
import type { Catalogos } from "@/lib/servicios";
import type { FiltroIncidencias } from "@/lib/tipos";

interface Props {
  filtro: FiltroIncidencias;
  /** Catálogos para mostrar los nombres (los inactivos vienen marcados); sin ellos (o con un id desconocido) se muestra "Zona: n.° 7". */
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
 * Texto de un filtro de dimensión, como aparece en su chip y en los avisos "Filtrado por" de los gráficos.
 *
 * @param clave dimensión (zona, tipo de evento o gravedad)
 * @param id id elegido en esa dimensión
 * @param catalogos catálogos para filtros; sin ellos, o si el id no está, se usa "n.° id"
 * @return por ejemplo "Zona: Zona Sur" o "Gravedad: n.° 7"
 */
export function textoFiltro(clave: ClaveDimension, id: number, catalogos: Catalogos | null): string {
  const etiqueta = DIMENSIONES.find((d) => d.clave === clave)?.etiqueta ?? clave;
  return `${etiqueta}: ${nombreDe(clave, id, catalogos) ?? `n.° ${id}`}`;
}

/**
 * Barra de filtros activos: un chip con "×" por cada filtro y "Quitar filtros" para volver a los últimos 30 días sin
 * filtros. El periodo solo aparece si no es el de defecto. Sin filtros muestra "Mostrando todo". Cada cambio se
 * anuncia a los lectores de pantalla con una región `aria-live`.
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
  for (const { clave } of DIMENSIONES) {
    const id = filtro[clave];
    if (id === null) continue;
    chips.push({ id: clave, texto: textoFiltro(clave, id, catalogos), quitar: () => onCambio(sinFiltro(filtro, clave)) });
  }

  const resumen = chips.length ? `Filtros activos: ${chips.map((c) => c.texto).join(", ")}` : "Mostrando todo";

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2">
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="anuncio-filtros">
        {resumen}
      </p>
      <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos" role="group">
        {chips.length === 0 && <span className="text-sm font-medium text-slate-500">Mostrando todo</span>}
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
        {chips.length > 0 && (
          <button
            type="button"
            onClick={() => onCambio(FILTRO_INICIAL)}
            className="rounded-lg border border-blue-900 px-3 py-1 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
          >
            Quitar filtros
          </button>
        )}
      </div>
    </div>
  );
}
