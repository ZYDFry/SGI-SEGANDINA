"use client";

import { Fragment, useCallback, useState } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import EstadoDatos from "@/components/EstadoDatos";
import FiltrosIncidencia, { FILTRO_INICIAL } from "@/components/FiltrosIncidencia";
import Paginacion from "@/components/Paginacion";
import { errorDeApi } from "@/lib/api";
import { formatearFechaHora } from "@/lib/fechas";
import { coloresGravedad } from "@/lib/gravedad";
import { buscarIncidencias, exportarReporte, type FormatoReporte } from "@/lib/servicios";
import type { FiltroIncidencias, IncidenciaHistorial } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";

type EstadoExportacion =
  | { tipo: "inactivo" }
  | { tipo: "generando"; formato: FormatoReporte }
  | { tipo: "listo"; nombre: string }
  | { tipo: "error"; mensaje: string };

/**
 * Historial de incidencias: filtros (periodo, zona, gravedad, tipo), tabla paginada en el servidor con detalle por
 * fila y exportación a Excel o PDF con los mismos filtros vigentes.
 */
export default function HistorialIncidencias() {
  const [filtro, setFiltro] = useState<FiltroIncidencias>(FILTRO_INICIAL);
  const [pagina, setPagina] = useState(0);
  const [tamano, setTamano] = useState(20);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [exportacion, setExportacion] = useState<EstadoExportacion>({ tipo: "inactivo" });

  const consulta = useConsulta(useCallback(() => buscarIncidencias(filtro, pagina, tamano), [filtro, pagina, tamano]));

  function cambiarFiltro(nuevo: FiltroIncidencias) {
    setFiltro(nuevo);
    setPagina(0);
    setAbierta(null);
  }

  async function exportar(formato: FormatoReporte) {
    setExportacion({ tipo: "generando", formato });
    try {
      const nombre = await exportarReporte(formato, filtro);
      setExportacion({ tipo: "listo", nombre });
    } catch (e) {
      const error = errorDeApi(e);
      setExportacion({ tipo: "error", mensaje: [error.mensaje, ...error.detalles].join(" · ") });
    }
  }

  const generando = exportacion.tipo === "generando";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Historial de incidencias</h1>
            <p className="text-sm text-slate-500">De la más reciente a la más antigua. Sin filtros: últimos 30 días.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Boton variante="secundario" className="py-2 text-sm" disabled={generando} onClick={() => exportar("excel")}>
              {generando && exportacion.formato === "excel" ? "Generando…" : "Exportar Excel"}
            </Boton>
            <Boton variante="secundario" className="py-2 text-sm" disabled={generando} onClick={() => exportar("pdf")}>
              {generando && exportacion.formato === "pdf" ? "Generando…" : "Exportar PDF"}
            </Boton>
          </div>
        </div>
        <FiltrosIncidencia valor={filtro} onCambio={cambiarFiltro} />
        {exportacion.tipo === "listo" && (
          <div className="mt-3">
            <Alerta tipo="exito">Se descargó {exportacion.nombre} con los filtros vigentes.</Alerta>
          </div>
        )}
        {exportacion.tipo === "error" && (
          <div className="mt-3">
            <Alerta tipo="error">No se pudo exportar: {exportacion.mensaje}</Alerta>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <EstadoDatos
          cargando={consulta.cargando}
          error={consulta.error}
          vacio={consulta.datos?.contenido.length === 0}
          mensajeVacio="No hay incidencias con estos filtros."
          onReintentar={consulta.recargar}
        >
          {consulta.datos && (
            <>
              <TablaIncidencias filas={consulta.datos.contenido} abierta={abierta} onAlternar={setAbierta} />
              <Paginacion
                pagina={consulta.datos.pagina}
                totalPaginas={consulta.datos.totalPaginas}
                totalElementos={consulta.datos.totalElementos}
                tamano={tamano}
                onPagina={(p) => {
                  setPagina(p);
                  setAbierta(null);
                }}
                onTamano={(t) => {
                  setTamano(t);
                  setPagina(0);
                }}
              />
            </>
          )}
        </EstadoDatos>
      </section>
    </div>
  );
}

interface PropsTabla {
  filas: IncidenciaHistorial[];
  abierta: number | null;
  onAlternar: (id: number | null) => void;
}

function TablaIncidencias({ filas, abierta, onAlternar }: PropsTabla) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            <th scope="col" className="py-2 pr-3 font-semibold">Fecha</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Zona</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Tipo</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Gravedad</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Usuario</th>
            <th scope="col" className="py-2 font-semibold">
              <span className="sr-only">Detalle</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => {
            const expandida = abierta === fila.idIncidencia;
            const idDetalle = `detalle-${fila.idIncidencia}`;
            return (
              <Fragment key={fila.idIncidencia}>
                <tr className="border-b border-slate-100 align-top">
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-800">{formatearFechaHora(fila.fechaHora)}</td>
                  <td className="py-2 pr-3 text-slate-800">{fila.zona.nombreZona}</td>
                  <td className="py-2 pr-3 text-slate-800">{fila.tipoEvento.nombreTipoEvento}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${coloresGravedad(fila.nivelGravedad.orden).insignia}`}
                    >
                      {fila.nivelGravedad.nombreNivel}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-800">
                    {fila.usuario.nombreCompleto}
                    <span className="block text-xs text-slate-500">DNI {fila.usuario.dni}</span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      aria-expanded={expandida}
                      aria-controls={idDetalle}
                      onClick={() => onAlternar(expandida ? null : fila.idIncidencia)}
                      className="whitespace-nowrap text-sm font-semibold text-blue-900 underline"
                    >
                      {expandida ? "Ocultar" : "Ver detalle"}
                    </button>
                  </td>
                </tr>
                {expandida && (
                  <tr id={idDetalle} className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={6} className="px-3 py-3">
                      <p className="whitespace-pre-wrap text-slate-800">{fila.descripcion}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        N.° {fila.idIncidencia} · Registrada en el sistema el {formatearFechaHora(fila.fechaRegistro)}
                        {" · "}
                        {fila.zona.distrito}, {fila.zona.provincia}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
