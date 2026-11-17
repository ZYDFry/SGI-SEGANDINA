"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import ChipsFiltros from "@/components/ChipsFiltros";
import EstadoDatos from "@/components/EstadoDatos";
import FiltrosIncidencia from "@/components/FiltrosIncidencia";
import GraficoAnillo from "@/components/graficos/GraficoAnillo";
import GraficoBarras from "@/components/graficos/GraficoBarras";
import GraficoSerie, { type TipoSerie } from "@/components/graficos/GraficoSerie";
import Tarjeta, { TarjetaKpi } from "@/components/Tarjeta";
import { formatearDia, formatearHora } from "@/lib/fechas";
import { alternarFiltro, sinFiltro, type ClaveDimension } from "@/lib/filtrosUrl";
import { coloresGravedad } from "@/lib/gravedad";
import {
  cargarCatalogos,
  obtenerDespliegue,
  obtenerKpis,
  obtenerPorTipo,
  obtenerPorZona,
  obtenerSerieTiempo,
} from "@/lib/servicios";
import type { Agrupacion, DespliegueZona, FiltroIncidencias, Kpis } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { useFiltroUrl } from "@/lib/useFiltroUrl";
import { REFRESCO_MS, useRefresco } from "@/lib/useRefresco";

const AGRUPACIONES: { valor: Agrupacion; etiqueta: string }[] = [
  { valor: "DIA", etiqueta: "Día" },
  { valor: "SEMANA", etiqueta: "Semana" },
  { valor: "MES", etiqueta: "Mes" },
];

type Consulta<T> = ReturnType<typeof useConsulta<T>>;

/** Aplica o quita el filtro de una dimensión (clic en una barra, un sector o una tarjeta). */
type Alternar = (clave: ClaveDimension, id: number) => void;

/**
 * Contenido del dashboard: filtros globales (periodo, zona, tipo y gravedad) guardados en la URL, chips de los
 * filtros activos, KPI, barras por zona, anillo por tipo, serie por tiempo y despliegue por zona.
 *
 * Filtrado cruzado: un clic en una barra de zona, un sector del anillo o una tarjeta de gravedad aplica ese filtro
 * (o lo quita si ya estaba). Cada gráfico se consulta sin su propio filtro, para seguir mostrando todas sus
 * opciones con la elegida resaltada. Cada bloque consulta su endpoint por separado (un error no afecta a los demás)
 * y todo se refresca cada 60 s.
 */
export default function PanelDashboard() {
  const { filtro, consulta, aplicar } = useFiltroUrl();
  const catalogos = useConsulta(cargarCatalogos);
  const [tipoSerie, setTipoSerie] = useState<TipoSerie>("linea");
  // null = agrupación por defecto del backend según el largo del rango; se olvida al cambiar el periodo.
  const clavePeriodo = `${filtro.periodo}|${filtro.desde ?? ""}|${filtro.hasta ?? ""}`;
  const [agrupacionElegida, setAgrupacionElegida] = useState<{ periodo: string; valor: Agrupacion } | null>(null);
  const agrupacion = agrupacionElegida?.periodo === clavePeriodo ? agrupacionElegida.valor : null;

  // Cada gráfico ignora su propio filtro.
  const filtroZonas = useMemo(() => sinFiltro(filtro, "idZona"), [filtro]);
  const filtroTipos = useMemo(() => sinFiltro(filtro, "idTipoEvento"), [filtro]);
  const filtroNiveles = useMemo(() => sinFiltro(filtro, "idNivelGravedad"), [filtro]);
  const hayNivel = filtro.idNivelGravedad !== null;

  // Tarjetas de gravedad: KPI sin el filtro de gravedad. Si no hay gravedad elegida, es la misma consulta de los KPI.
  const kpisNiveles = useConsulta(useCallback(() => obtenerKpis(filtroNiveles), [filtroNiveles]));
  const kpisConNivel = useConsulta<Kpis | null>(
    useCallback(() => (hayNivel ? obtenerKpis(filtro) : Promise.resolve(null)), [filtro, hayNivel]),
  );
  const kpis: Consulta<Kpis | null> = hayNivel ? kpisConNivel : kpisNiveles;
  const porZona = useConsulta(useCallback(() => obtenerPorZona(filtroZonas), [filtroZonas]));
  const porTipo = useConsulta(useCallback(() => obtenerPorTipo(filtroTipos), [filtroTipos]));
  const serie = useConsulta(useCallback(() => obtenerSerieTiempo(filtro, agrupacion), [filtro, agrupacion]));
  const despliegue = useConsulta(obtenerDespliegue);

  const { recargar: recargarNiveles } = kpisNiveles;
  const { recargar: recargarConNivel } = kpisConNivel;
  const { recargar: recargarZona } = porZona;
  const { recargar: recargarTipo } = porTipo;
  const { recargar: recargarSerie } = serie;
  const { recargar: recargarDespliegue } = despliegue;
  const recargarTodo = useCallback(() => {
    recargarNiveles();
    recargarConNivel();
    recargarZona();
    recargarTipo();
    recargarSerie();
    recargarDespliegue();
  }, [recargarNiveles, recargarConNivel, recargarZona, recargarTipo, recargarSerie, recargarDespliegue]);
  useRefresco(recargarTodo);
  const actualizando = [kpisNiveles, kpisConNivel, porZona, porTipo, serie, despliegue].some((c) => c.actualizando);

  const alternar = useCallback<Alternar>((clave, id) => aplicar(alternarFiltro(filtro, clave, id)), [aplicar, filtro]);

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Dashboard gerencial</h1>
            <p className="text-sm text-slate-500">
              {kpis.datos
                ? `Periodo: ${formatearDia(kpis.datos.desde)} al ${formatearDia(kpis.datos.hasta)}`
                : "Periodo: —"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span aria-live="polite">
              {actualizando
                ? "Actualizando…"
                : kpis.actualizadoEn
                  ? `Actualizado ${formatearHora(kpis.actualizadoEn)} · cada ${REFRESCO_MS / 1000} s`
                  : null}
            </span>
            <button
              type="button"
              onClick={recargarTodo}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>
            <Link
              href={consulta ? `/historial?${consulta}` : "/historial"}
              className="rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
            >
              Ver en historial
            </Link>
          </div>
        </div>
        <FiltrosIncidencia valor={filtro} onCambio={aplicar} catalogos={catalogos} sinQuitar />
        <ChipsFiltros filtro={filtro} catalogos={catalogos.datos} onCambio={aplicar} />
        <p className="text-xs text-slate-500">
          Haz clic en una barra de zona, un sector del anillo o una tarjeta de gravedad para filtrar todo el panel;
          otro clic lo quita.
        </p>
      </section>

      <SeccionIndicadores kpis={kpis} kpisNiveles={kpisNiveles} despliegue={despliegue} filtro={filtro} alternar={alternar} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tarjeta titulo="Incidencias por zona">
          <EstadoDatos
            cargando={porZona.cargando}
            error={porZona.error}
            vacio={porZona.datos?.length === 0}
            onReintentar={porZona.recargar}
          >
            {porZona.datos && (
              <GraficoBarras
                titulo="Incidencias por zona"
                datos={porZona.datos}
                seleccionado={filtro.idZona}
                onElegir={(id) => alternar("idZona", id)}
              />
            )}
          </EstadoDatos>
        </Tarjeta>

        <Tarjeta titulo="Incidencias por tipo de evento">
          <EstadoDatos
            cargando={porTipo.cargando}
            error={porTipo.error}
            vacio={porTipo.datos?.length === 0}
            onReintentar={porTipo.recargar}
          >
            {porTipo.datos && (
              <GraficoAnillo
                titulo="Incidencias por tipo de evento"
                datos={porTipo.datos}
                seleccionado={filtro.idTipoEvento}
                onElegir={(id) => alternar("idTipoEvento", id)}
              />
            )}
          </EstadoDatos>
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Incidencias en el tiempo"
        acciones={
          <div className="flex flex-wrap gap-2">
            <Segmentado
              etiqueta="Agrupación"
              opciones={AGRUPACIONES}
              valor={agrupacion ?? serie.datos?.agrupacion ?? null}
              onCambio={(valor) => setAgrupacionElegida({ periodo: clavePeriodo, valor })}
            />
            <Segmentado
              etiqueta="Tipo de gráfico"
              opciones={[
                { valor: "linea", etiqueta: "Línea" },
                { valor: "barras", etiqueta: "Barras" },
              ]}
              valor={tipoSerie}
              onCambio={setTipoSerie}
            />
          </div>
        }
      >
        <EstadoDatos
          cargando={serie.cargando}
          error={serie.error}
          vacio={!!serie.datos && serie.datos.puntos.every((p) => p.total === 0)}
          onReintentar={serie.recargar}
        >
          {serie.datos && <GraficoSerie titulo="Incidencias en el tiempo" serie={serie.datos} tipo={tipoSerie} />}
        </EstadoDatos>
      </Tarjeta>

      {/* Aquí se sumará la sección "Atención de casos" (recibe `filtro` y `alternar`, como los demás bloques). */}

      <SeccionDespliegue despliegue={despliegue} />
    </div>
  );
}

interface PropsIndicadores {
  /** KPI con todos los filtros (hoy y periodo). */
  kpis: Consulta<Kpis | null>;
  /** KPI sin el filtro de gravedad: alimenta las tarjetas por nivel. */
  kpisNiveles: Consulta<Kpis>;
  despliegue: Consulta<DespliegueZona[]>;
  filtro: FiltroIncidencias;
  alternar: Alternar;
}

/** KPI generales y tarjetas por nivel de gravedad (filtran al hacer clic). */
function SeccionIndicadores({ kpis, kpisNiveles, despliegue, filtro, alternar }: PropsIndicadores) {
  const totalVigilantes = despliegue.datos?.reduce((suma, z) => suma + z.vigilantesActivos, 0) ?? null;
  const zonasSinVigilantes = despliegue.datos?.filter((z) => z.vigilantesActivos === 0).length ?? 0;
  const error = kpis.error ?? kpisNiveles.error;
  const elegido = filtro.idNivelGravedad;

  if (error) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <EstadoDatos
          cargando={false}
          error={error}
          vacio={false}
          onReintentar={() => {
            kpis.recargar();
            kpisNiveles.recargar();
          }}
        >
          {null}
        </EstadoDatos>
      </section>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaKpi etiqueta="Incidencias de hoy" valor={kpis.datos?.incidenciasHoy ?? null} cargando={kpis.cargando} />
        <TarjetaKpi
          etiqueta="Incidencias del periodo"
          valor={kpis.datos?.incidenciasPeriodo ?? null}
          cargando={kpis.cargando}
          detalle={kpis.datos ? `${formatearDia(kpis.datos.desde)} al ${formatearDia(kpis.datos.hasta)}` : undefined}
        />
        <TarjetaKpi
          etiqueta="Vigilantes desplegados"
          valor={despliegue.error ? "!" : totalVigilantes}
          cargando={despliegue.cargando}
          alerta={zonasSinVigilantes > 0 || !!despliegue.error}
          color={zonasSinVigilantes > 0 ? "#dc2626" : undefined}
          detalle={
            despliegue.error
              ? "No se pudo cargar el despliegue"
              : despliegue.datos
                ? `${despliegue.datos.length} zonas activas${zonasSinVigilantes ? ` · ${zonasSinVigilantes} sin vigilantes` : ""}`
                : undefined
          }
        />
      </div>
      {kpisNiveles.datos && (
        <div role="group" aria-label="Filtrar por gravedad" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpisNiveles.datos.porGravedad.map((nivel) => (
            <TarjetaKpi
              key={nivel.idNivelGravedad}
              etiqueta={`Gravedad ${nivel.nombreNivel}`}
              valor={nivel.total}
              color={coloresGravedad(nivel.orden).hex}
              alerta={nivel.orden >= 4 && nivel.total > 0}
              onElegir={() => alternar("idNivelGravedad", nivel.idNivelGravedad)}
              seleccionada={elegido === nivel.idNivelGravedad}
              atenuada={elegido !== null && elegido !== nivel.idNivelGravedad}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Vigilantes activos por zona activa (RF-07): no depende de los filtros. */
function SeccionDespliegue({ despliegue }: { despliegue: Consulta<DespliegueZona[]> }) {
  return (
    <Tarjeta titulo="Despliegue de vigilantes por zona">
      <EstadoDatos
        cargando={despliegue.cargando}
        error={despliegue.error}
        vacio={despliegue.datos?.length === 0}
        mensajeVacio="No hay zonas activas."
        onReintentar={despliegue.recargar}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Zona
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Vigilantes activos
                </th>
              </tr>
            </thead>
            <tbody>
              {despliegue.datos?.map((zona) => (
                <tr key={zona.idZona} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 text-slate-800">{zona.nombreZona}</td>
                  <td className="py-2 text-right">
                    {zona.vigilantesActivos === 0 ? (
                      <span className="font-semibold text-red-600">0 · Sin vigilantes</span>
                    ) : (
                      <span className="font-semibold text-slate-900">{zona.vigilantesActivos}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EstadoDatos>
    </Tarjeta>
  );
}

interface PropsSegmentado<V extends string> {
  etiqueta: string;
  opciones: { valor: V; etiqueta: string }[];
  valor: V | null;
  onCambio: (valor: V) => void;
}

/** Grupo pequeño de botones excluyentes (agrupación y tipo de gráfico). */
function Segmentado<V extends string>({ etiqueta, opciones, valor, onCambio }: PropsSegmentado<V>) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex overflow-hidden rounded-lg border border-slate-300">
      {opciones.map((opcion) => {
        const marcada = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={marcada}
            onClick={() => onCambio(opcion.valor)}
            className={`px-3 py-1 text-xs font-semibold ${
              marcada ? "bg-blue-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
