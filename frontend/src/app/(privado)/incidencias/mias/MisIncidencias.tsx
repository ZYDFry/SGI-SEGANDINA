"use client";

import Link from "next/link";
import { Fragment, useCallback, useState } from "react";
import Alerta from "@/components/Alerta";
import DetalleIncidencia, { InsigniaGravedad } from "@/components/DetalleIncidencia";
import EstadoDatos from "@/components/EstadoDatos";
import Modal from "@/components/Modal";
import Paginacion from "@/components/Paginacion";
import SelectorPeriodo, { PERIODO_INICIAL } from "@/components/SelectorPeriodo";
import { formatearCuenta, formatearFechaHora } from "@/lib/fechas";
import { buscarMisIncidencias } from "@/lib/servicios";
import type { FiltroPeriodo, IncidenciaResponse, MiIncidencia } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { useCuentaRegresiva } from "@/lib/useCuentaRegresiva";
import FormularioIncidencia from "../nueva/FormularioIncidencia";

/**
 * "Mis incidencias": las que registró el usuario de la sesión, de la más reciente a la más antigua, con selector
 * de periodo y paginación en el servidor. Mobile-First: tarjetas en el celular y tabla desde `sm`; cada
 * incidencia despliega su descripción con "Ver detalle". Mientras dura el plazo de corrección (`editableHasta`)
 * muestra "Corregir (quedan mm:ss)", que abre el formulario del registro en un modal.
 */
export default function MisIncidencias() {
  const [periodo, setPeriodo] = useState<FiltroPeriodo>(PERIODO_INICIAL);
  const [pagina, setPagina] = useState(0);
  const [tamano, setTamano] = useState(20);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<MiIncidencia | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [corregida, setCorregida] = useState<IncidenciaResponse | null>(null);

  const consulta = useConsulta(
    useCallback(() => buscarMisIncidencias(periodo, pagina, tamano), [periodo, pagina, tamano]),
  );

  function irAPagina(p: number) {
    setPagina(p);
    setAbierta(null);
  }

  function cambiarPeriodo(nuevo: FiltroPeriodo) {
    setPeriodo(nuevo);
    irAPagina(0);
  }

  const alternar = (id: number) => setAbierta((actual) => (actual === id ? null : id));

  function abrirCorreccion(fila: MiIncidencia) {
    setCorregida(null);
    setCorrigiendo(fila);
  }

  function alCorregir(incidencia: IncidenciaResponse) {
    setCorrigiendo(null);
    setCorregida(incidencia);
    consulta.recargar();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Mis incidencias</h1>
            <p className="text-sm text-slate-500">Las que registró usted, de la más reciente a la más antigua.</p>
          </div>
          <Link
            href="/incidencias/nueva"
            className="rounded-lg border border-blue-900 px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
          >
            Registrar incidencia
          </Link>
        </div>
        <SelectorPeriodo valor={periodo} onCambio={cambiarPeriodo} />
      </section>

      {corregida && (
        <Alerta tipo="exito">
          <p className="font-semibold">Incidencia N.° {corregida.idIncidencia} corregida</p>
        </Alerta>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <EstadoDatos
          cargando={consulta.cargando}
          error={consulta.error}
          vacio={consulta.datos?.contenido.length === 0}
          mensajeVacio="No registró incidencias en este periodo."
          onReintentar={consulta.recargar}
        >
          {consulta.datos && (
            <>
              <ListaTarjetas
                filas={consulta.datos.contenido}
                abierta={abierta}
                onAlternar={alternar}
                onCorregir={abrirCorreccion}
              />
              <TablaMisIncidencias
                filas={consulta.datos.contenido}
                abierta={abierta}
                onAlternar={alternar}
                onCorregir={abrirCorreccion}
              />
              <Paginacion
                pagina={consulta.datos.pagina}
                totalPaginas={consulta.datos.totalPaginas}
                totalElementos={consulta.datos.totalElementos}
                tamano={tamano}
                onPagina={irAPagina}
                onTamano={(t) => {
                  setTamano(t);
                  irAPagina(0);
                }}
              />
            </>
          )}
        </EstadoDatos>
      </section>

      {corrigiendo && (
        <Modal
          titulo={`Corregir incidencia N.° ${corrigiendo.idIncidencia}`}
          subtitulo={`Registrada el ${formatearFechaHora(corrigiendo.fechaRegistro)}`}
          onCerrar={() => setCorrigiendo(null)}
          bloqueado={guardando}
          ancho="lg"
        >
          <FormularioIncidencia
            correccion={{
              incidencia: corrigiendo,
              onCorregida: alCorregir,
              onCancelar: () => setCorrigiendo(null),
              onEnviando: setGuardando,
            }}
          />
        </Modal>
      )}
    </div>
  );
}

interface PropsLista {
  filas: MiIncidencia[];
  abierta: number | null;
  onAlternar: (id: number) => void;
  onCorregir: (fila: MiIncidencia) => void;
}

/**
 * "Corregir (quedan mm:ss)" mientras dura el plazo de corrección; al vencer desaparece solo. Si el reloj del
 * dispositivo va adelantado o atrasado, el backend tiene la última palabra (400 con el motivo en el modal).
 */
function BotonCorregir({ fila, onCorregir }: { fila: MiIncidencia; onCorregir: (fila: MiIncidencia) => void }) {
  const segundos = useCuentaRegresiva(fila.editableHasta);
  if (segundos <= 0) return null;
  return (
    <button
      type="button"
      onClick={() => onCorregir(fila)}
      className="whitespace-nowrap text-sm font-semibold text-blue-900 underline"
    >
      Corregir (quedan {formatearCuenta(segundos)})
    </button>
  );
}

function BotonDetalle({ fila, abierta, onAlternar, prefijo }: { fila: MiIncidencia; prefijo: string } & Omit<PropsLista, "filas" | "onCorregir">) {
  const expandida = abierta === fila.idIncidencia;
  return (
    <button
      type="button"
      aria-expanded={expandida}
      aria-controls={`${prefijo}-${fila.idIncidencia}`}
      onClick={() => onAlternar(fila.idIncidencia)}
      className="whitespace-nowrap text-sm font-semibold text-blue-900 underline"
    >
      {expandida ? "Ocultar" : "Ver detalle"}
    </button>
  );
}

// Celular (< sm): una tarjeta por incidencia
function ListaTarjetas({ filas, abierta, onAlternar, onCorregir }: PropsLista) {
  return (
    <ul className="space-y-3 sm:hidden" aria-label="Mis incidencias">
      {filas.map((fila) => (
        <li key={fila.idIncidencia} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{fila.tipoEvento.nombreTipoEvento}</p>
              <p className="text-sm text-slate-600">{fila.zona.nombreZona}</p>
              <p className="text-xs text-slate-500">{formatearFechaHora(fila.fechaHora)}</p>
            </div>
            <InsigniaGravedad nivel={fila.nivelGravedad} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <BotonDetalle fila={fila} abierta={abierta} onAlternar={onAlternar} prefijo="tarjeta-detalle" />
            <BotonCorregir fila={fila} onCorregir={onCorregir} />
          </div>
          {abierta === fila.idIncidencia && (
            <div id={`tarjeta-detalle-${fila.idIncidencia}`} className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
              <DetalleIncidencia {...fila} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// Desde sm: tabla con las mismas columnas del historial, sin "Usuario"
function TablaMisIncidencias({ filas, abierta, onAlternar, onCorregir }: PropsLista) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            <th scope="col" className="py-2 pr-3 font-semibold">Fecha</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Zona</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Tipo</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Gravedad</th>
            <th scope="col" className="py-2 font-semibold">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <Fragment key={fila.idIncidencia}>
              <tr className="border-b border-slate-100 align-top">
                <td className="whitespace-nowrap py-2 pr-3 text-slate-800">{formatearFechaHora(fila.fechaHora)}</td>
                <td className="py-2 pr-3 text-slate-800">{fila.zona.nombreZona}</td>
                <td className="py-2 pr-3 text-slate-800">{fila.tipoEvento.nombreTipoEvento}</td>
                <td className="py-2 pr-3">
                  <InsigniaGravedad nivel={fila.nivelGravedad} />
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-4">
                    <BotonCorregir fila={fila} onCorregir={onCorregir} />
                    <BotonDetalle fila={fila} abierta={abierta} onAlternar={onAlternar} prefijo="fila-detalle" />
                  </div>
                </td>
              </tr>
              {abierta === fila.idIncidencia && (
                <tr id={`fila-detalle-${fila.idIncidencia}`} className="border-b border-slate-100 bg-slate-50">
                  <td colSpan={5} className="px-3 py-3">
                    <DetalleIncidencia {...fila} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
