"use client";

import SelectorPeriodo from "@/components/SelectorPeriodo";
import { FILTRO_INICIAL } from "@/lib/filtrosUrl";
import type { Catalogos } from "@/lib/servicios";
import type { FiltroIncidencias, FiltroPeriodo } from "@/lib/tipos";
import type { useConsulta } from "@/lib/useConsulta";

export { FILTRO_INICIAL };

/** Resultado de `useConsulta(cargarCatalogos)`: lo carga la pantalla para compartirlo con otros componentes. */
export type ConsultaCatalogos = ReturnType<typeof useConsulta<Catalogos>>;

interface Props {
  valor: FiltroIncidencias;
  onCambio: (filtro: FiltroIncidencias) => void;
  /** Zonas, tipos y niveles activos para las listas. */
  catalogos: ConsultaCatalogos;
  /** Oculta el enlace "Quitar filtros" (el dashboard tiene sus propios chips con "Quitar todo"). */
  sinQuitar?: boolean;
}

/**
 * Filtros del historial, la exportación y el dashboard: periodo, zona, gravedad y tipo de evento. Las listas salen
 * de los catálogos activos; cada cambio se aplica al momento.
 */
export default function FiltrosIncidencia({ valor, onCambio, catalogos, sinQuitar = false }: Props) {
  const deshabilitado = catalogos.cargando || !!catalogos.error;

  function cambiarPeriodo(periodo: FiltroPeriodo) {
    onCambio({ ...valor, periodo: periodo.periodo, desde: periodo.desde, hasta: periodo.hasta });
  }

  // Un id que no está entre las opciones (p. ej. una zona inactiva llegada por la URL) se muestra igual.
  function conElegido(opciones: { valor: number; etiqueta: string }[], id: number | null, prefijo: string) {
    return id === null || opciones.some((o) => o.valor === id) || !catalogos.datos
      ? opciones
      : [...opciones, { valor: id, etiqueta: `${prefijo} n.° ${id}` }];
  }

  const hayFiltros = valor.idZona !== null || valor.idNivelGravedad !== null || valor.idTipoEvento !== null;

  return (
    <div className="space-y-3">
      {/* La clave lo reinicia cuando el periodo cambia desde fuera (p. ej. "Atrás" en el navegador). */}
      <SelectorPeriodo
        key={`${valor.periodo}|${valor.desde ?? ""}|${valor.hasta ?? ""}`}
        valor={valor}
        onCambio={cambiarPeriodo}
      />
      <div className="flex flex-wrap items-end gap-3">
        <Seleccion
          id="filtro-zona"
          etiqueta="Zona"
          todos="Todas las zonas"
          valor={valor.idZona}
          opciones={conElegido(
            catalogos.datos?.zonas.map((z) => ({ valor: z.idZona, etiqueta: z.nombreZona })) ?? [],
            valor.idZona,
            "Zona",
          )}
          deshabilitado={deshabilitado}
          onCambio={(idZona) => onCambio({ ...valor, idZona })}
        />
        <Seleccion
          id="filtro-gravedad"
          etiqueta="Gravedad"
          todos="Todas"
          valor={valor.idNivelGravedad}
          opciones={conElegido(
            catalogos.datos?.niveles.map((n) => ({ valor: n.idNivelGravedad, etiqueta: n.nombreNivel })) ?? [],
            valor.idNivelGravedad,
            "Nivel",
          )}
          deshabilitado={deshabilitado}
          onCambio={(idNivelGravedad) => onCambio({ ...valor, idNivelGravedad })}
        />
        <Seleccion
          id="filtro-tipo"
          etiqueta="Tipo de evento"
          todos="Todos los tipos"
          valor={valor.idTipoEvento}
          opciones={conElegido(
            catalogos.datos?.tipos.map((t) => ({ valor: t.idTipoEvento, etiqueta: t.nombreTipoEvento })) ?? [],
            valor.idTipoEvento,
            "Tipo",
          )}
          deshabilitado={deshabilitado}
          onCambio={(idTipoEvento) => onCambio({ ...valor, idTipoEvento })}
        />
        {hayFiltros && !sinQuitar && (
          <button
            type="button"
            onClick={() => onCambio({ ...valor, idZona: null, idNivelGravedad: null, idTipoEvento: null })}
            className="py-2 text-sm font-semibold text-blue-900 underline"
          >
            Quitar filtros
          </button>
        )}
      </div>
      {catalogos.error && (
        <p role="alert" className="text-sm text-red-600">
          No se pudieron cargar las zonas, tipos y niveles: {catalogos.error.mensaje}{" "}
          <button type="button" onClick={catalogos.recargar} className="font-semibold underline">
            Reintentar
          </button>
        </p>
      )}
    </div>
  );
}

interface PropsSeleccion {
  id: string;
  etiqueta: string;
  todos: string;
  valor: number | null;
  opciones: { valor: number; etiqueta: string }[];
  deshabilitado: boolean;
  onCambio: (valor: number | null) => void;
}

function Seleccion({ id, etiqueta, todos, valor, opciones, deshabilitado, onCambio }: PropsSeleccion) {
  return (
    <div className="w-full sm:w-52">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-700">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor ?? ""}
        disabled={deshabilitado}
        onChange={(e) => onCambio(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20 disabled:bg-slate-100"
      >
        <option value="">{todos}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
