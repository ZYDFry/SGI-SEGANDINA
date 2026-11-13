"use client";

import { useCallback, useMemo, useState } from "react";
import EstadoDatos from "@/components/EstadoDatos";
import GraficoAnillo from "@/components/graficos/GraficoAnillo";
import GraficoBarras from "@/components/graficos/GraficoBarras";
import GraficoSerie, { type TipoSerie } from "@/components/graficos/GraficoSerie";
import SelectorPeriodo, { PERIODO_INICIAL } from "@/components/SelectorPeriodo";
import Tarjeta, { TarjetaKpi } from "@/components/Tarjeta";
import { formatearDia, formatearHora } from "@/lib/fechas";
import { coloresGravedad } from "@/lib/gravedad";
import {
  obtenerDespliegue,
  obtenerKpis,
  obtenerPorTipo,
  obtenerPorZona,
  obtenerSerieTiempo,
} from "@/lib/servicios";
import type { Agrupacion, FiltroIncidencias, FiltroPeriodo } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { REFRESCO_MS, useRefresco } from "@/lib/useRefresco";

const AGRUPACIONES: { valor: Agrupacion; etiqueta: string }[] = [
  { valor: "DIA", etiqueta: "Día" },
  { valor: "SEMANA", etiqueta: "Semana" },
  { valor: "MES", etiqueta: "Mes" },
];

/**
 * Contenido del dashboard: periodo, KPI, barras por zona, anillo por tipo, serie por tiempo y despliegue por zona.
 * Cada bloque consulta su endpoint por separado (un error no afecta a los demás) y todo se refresca cada 60 s.
 */
export default function PanelDashboard() {
  const [periodo, setPeriodo] = useState<FiltroPeriodo>(PERIODO_INICIAL);
  // null = agrupación por defecto del backend según el largo del rango.
  const [agrupacion, setAgrupacion] = useState<Agrupacion | null>(null);
  const [tipoSerie, setTipoSerie] = useState<TipoSerie>("linea");

  const filtro = useMemo<FiltroIncidencias>(
    () => ({ ...periodo, idZona: null, idNivelGravedad: null, idTipoEvento: null }),
    [periodo],
  );

  const kpis = useConsulta(useCallback(() => obtenerKpis(filtro), [filtro]));
  const porZona = useConsulta(useCallback(() => obtenerPorZona(filtro), [filtro]));
  const porTipo = useConsulta(useCallback(() => obtenerPorTipo(filtro), [filtro]));
  const serie = useConsulta(useCallback(() => obtenerSerieTiempo(filtro, agrupacion), [filtro, agrupacion]));
  const despliegue = useConsulta(obtenerDespliegue);

  const { recargar: recargarKpis } = kpis;
  const { recargar: recargarZona } = porZona;
  const { recargar: recargarTipo } = porTipo;
  const { recargar: recargarSerie } = serie;
  const { recargar: recargarDespliegue } = despliegue;
  const recargarTodo = useCallback(() => {
    recargarKpis();
    recargarZona();
    recargarTipo();
    recargarSerie();
    recargarDespliegue();
  }, [recargarKpis, recargarZona, recargarTipo, recargarSerie, recargarDespliegue]);
  useRefresco(recargarTodo);

  function cambiarPeriodo(nuevo: FiltroPeriodo) {
    setPeriodo(nuevo);
    setAgrupacion(null);
  }

  const actualizando =
    kpis.actualizando || porZona.actualizando || porTipo.actualizando || serie.actualizando || despliegue.actualizando;
  const totalVigilantes = despliegue.datos?.reduce((suma, z) => suma + z.vigilantesActivos, 0) ?? null;
  const zonasSinVigilantes = despliegue.datos?.filter((z) => z.vigilantesActivos === 0).length ?? 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Dashboard gerencial</h1>
            <p className="text-sm text-slate-500">
              {kpis.datos
                ? `Periodo: ${formatearDia(kpis.datos.desde)} al ${formatearDia(kpis.datos.hasta)}`
                : "Periodo: —"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
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
          </div>
        </div>
        <SelectorPeriodo valor={periodo} onCambio={cambiarPeriodo} />
      </section>

      {/* KPI */}
      {kpis.error ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <EstadoDatos cargando={false} error={kpis.error} vacio={false} onReintentar={kpis.recargar}>
            {null}
          </EstadoDatos>
        </section>
      ) : (
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
      )}
      {kpis.datos && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.datos.porGravedad.map((nivel) => (
            <TarjetaKpi
              key={nivel.idNivelGravedad}
              etiqueta={`Gravedad ${nivel.nombreNivel}`}
              valor={nivel.total}
              color={coloresGravedad(nivel.orden).hex}
              alerta={nivel.orden >= 4 && nivel.total > 0}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tarjeta titulo="Incidencias por zona">
          <EstadoDatos
            cargando={porZona.cargando}
            error={porZona.error}
            vacio={porZona.datos?.length === 0}
            onReintentar={porZona.recargar}
          >
            {porZona.datos && <GraficoBarras titulo="Incidencias por zona" datos={porZona.datos} />}
          </EstadoDatos>
        </Tarjeta>

        <Tarjeta titulo="Incidencias por tipo de evento">
          <EstadoDatos
            cargando={porTipo.cargando}
            error={porTipo.error}
            vacio={porTipo.datos?.length === 0}
            onReintentar={porTipo.recargar}
          >
            {porTipo.datos && <GraficoAnillo titulo="Incidencias por tipo de evento" datos={porTipo.datos} />}
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
              onCambio={setAgrupacion}
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
    </div>
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
