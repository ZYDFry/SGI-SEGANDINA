"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import ChipsFiltros from "@/components/ChipsFiltros";
import EstadoDatos from "@/components/EstadoDatos";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import SelectorPeriodo from "@/components/SelectorPeriodo";
import Tarjeta, { TarjetaKpi } from "@/components/Tarjeta";
import { formatearFechaHora } from "@/lib/fechas";
import { consultaDesdeFiltro, sinFiltro } from "@/lib/filtrosUrl";
import {
  buscarIncidencias,
  cargarCatalogosFiltro,
  listarVigilantes,
  listarZonasActivas,
  obtenerCargaPorZona,
  obtenerZonaDespliegue,
} from "@/lib/servicios";
import type { FiltroIncidencias, FiltroPeriodo } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { useFiltroUrl } from "@/lib/useFiltroUrl";
import { nombreCompleto } from "../../personal/nombreCompleto";
import ReasignarVigilante, { type Reasignacion } from "./ReasignarVigilante";

/** Incidencias recientes que se muestran; el resto se ve en el historial. */
const RECIENTES = 5;

/**
 * Despliegue de una zona (RF-07): datos de la zona, su carga en el periodo (incidencias, vigilantes activos e
 * incidencias por vigilante), los vigilantes asignados con su estado y las incidencias recientes con enlace al
 * historial filtrado por la zona. El periodo y los filtros de tipo y gravedad llegan del dashboard por la URL.
 *
 * Desde aquí el Administrador y el Supervisor mueven un vigilante de esta zona a otra o traen uno de otra zona, con
 * confirmación. Mover a un vigilante no cambia la zona de sus incidencias pasadas.
 */
export default function PantallaZona({ idZona }: { idZona: number }) {
  const { filtro: filtroUrl, aplicar } = useFiltroUrl();
  // La zona va en la ruta: los filtros de la URL se usan sin su idZona
  const filtroBase = useMemo(() => sinFiltro(filtroUrl, "idZona"), [filtroUrl]);
  const filtro = useMemo<FiltroIncidencias>(() => ({ ...filtroBase, idZona }), [filtroBase, idZona]);
  const consultaBase = consultaDesdeFiltro(filtroBase);

  const zona = useConsulta(useCallback(() => obtenerZonaDespliegue(idZona), [idZona]));
  const vigilantes = useConsulta(useCallback(() => listarVigilantes({ idZona }), [idZona]));
  const carga = useConsulta(useCallback(() => obtenerCargaPorZona(filtro), [filtro]));
  const recientes = useConsulta(useCallback(() => buscarIncidencias(filtro, 0, RECIENTES), [filtro]));
  const catalogos = useConsulta(cargarCatalogosFiltro);

  const [reasignacion, setReasignacion] = useState<Reasignacion | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const fila = carga.datos?.find((c) => c.idZona === idZona);
  const activos = vigilantes.datos?.filter((v) => v.estadoActivo).length ?? null;
  const zonaActiva = zona.datos?.estadoActivo ?? false;

  // Carga las listas que necesita el diálogo (zonas activas o vigilantes activos de otras zonas) y lo abre
  async function abrir(preparar: () => Promise<Reasignacion>) {
    setMensaje(null);
    setPreparando(true);
    try {
      setReasignacion(await preparar());
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las opciones. Intenta de nuevo." });
    } finally {
      setPreparando(false);
    }
  }

  function guardado(texto: string) {
    setReasignacion(null);
    setMensaje({ tipo: "exito", texto });
    vigilantes.recargar();
    carga.recargar();
  }

  if (zona.error) {
    return (
      <div className="space-y-4">
        <VolverDashboard consulta={consultaBase} />
        <EstadoDatos cargando={false} error={zona.error} vacio={false} onReintentar={zona.recargar}>
          {null}
        </EstadoDatos>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <VolverDashboard consulta={consultaBase} />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-blue-900">{zona.datos?.nombreZona ?? "Zona"}</h1>
          {zona.datos && <EtiquetaEstado activo={zona.datos.estadoActivo} femenino />}
        </div>
        {zona.datos && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Dato etiqueta="Ubicación" valor={`${zona.datos.distrito}, ${zona.datos.provincia}, ${zona.datos.departamento}`} />
            {zona.datos.referencia && <Dato etiqueta="Referencia" valor={zona.datos.referencia} />}
            {zona.datos.descripcion && <Dato etiqueta="Descripción" valor={zona.datos.descripcion} />}
          </dl>
        )}
        {zona.datos && !zonaActiva && (
          <Alerta tipo="aviso">La zona está inactiva: no se le pueden asignar vigilantes.</Alerta>
        )}
        <SelectorPeriodo
          key={`${filtroBase.periodo}|${filtroBase.desde ?? ""}|${filtroBase.hasta ?? ""}`}
          valor={filtroBase}
          onCambio={(p: FiltroPeriodo) => aplicar({ ...filtroBase, periodo: p.periodo, desde: p.desde, hasta: p.hasta })}
        />
        <ChipsFiltros filtro={filtroBase} catalogos={catalogos.datos} onCambio={aplicar} />
      </section>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaKpi etiqueta="Incidencias del periodo" valor={carga.error ? "!" : (fila?.incidencias ?? 0)} cargando={carga.cargando} />
        <TarjetaKpi
          etiqueta="Vigilantes activos"
          valor={activos}
          cargando={vigilantes.cargando}
          alerta={activos === 0}
          color={activos === 0 ? "#dc2626" : undefined}
          detalle={activos === 0 ? "Sin vigilantes" : undefined}
        />
        <TarjetaKpi
          etiqueta="Incidencias por vigilante"
          valor={carga.error ? "!" : fila?.incidenciasPorVigilante?.toLocaleString("es-PE", { maximumFractionDigits: 2 }) ?? "—"}
          cargando={carga.cargando}
        />
      </div>

      <Tarjeta
        titulo="Vigilantes asignados"
        acciones={
          <Boton
            variante="secundario"
            disabled={!zonaActiva || preparando || !zona.datos}
            onClick={() =>
              abrir(async () => ({
                tipo: "traer",
                zona: zona.datos!,
                vigilantes: await listarVigilantes({ activo: true }),
              }))
            }
          >
            Asignar vigilante de otra zona
          </Boton>
        }
      >
        <EstadoDatos
          cargando={vigilantes.cargando}
          error={vigilantes.error}
          vacio={vigilantes.datos?.length === 0}
          mensajeVacio="La zona no tiene vigilantes asignados."
          onReintentar={vigilantes.recargar}
        >
          <ul className="divide-y divide-slate-100" aria-label="Vigilantes de la zona">
            {vigilantes.datos?.map((v) => (
              <li key={v.idUsuario} data-vigilante={v.idUsuario} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2 text-sm text-slate-800">
                  {nombreCompleto(v)} <EtiquetaEstado activo={v.estadoActivo} />
                </span>
                {v.estadoActivo && (
                  <Boton
                    variante="secundario"
                    className="px-3 py-1.5 text-sm"
                    disabled={preparando}
                    aria-label={`Mover a otra zona: ${nombreCompleto(v)}`}
                    onClick={() =>
                      abrir(async () => ({ tipo: "mover", vigilante: v, zonas: await listarZonasActivas() }))
                    }
                  >
                    Mover a otra zona
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        </EstadoDatos>
      </Tarjeta>

      <Tarjeta
        titulo="Incidencias recientes"
        acciones={
          <Link
            href={`/historial?${consultaDesdeFiltro(filtro)}`}
            className="rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
          >
            Ver en historial
          </Link>
        }
      >
        <EstadoDatos
          cargando={recientes.cargando}
          error={recientes.error}
          vacio={recientes.datos?.contenido.length === 0}
          mensajeVacio="Sin incidencias en el periodo."
          onReintentar={recientes.recargar}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">Fecha y hora</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Tipo</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Gravedad</th>
                  <th scope="col" className="py-2 font-semibold">Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {recientes.datos?.contenido.map((i) => (
                  <tr key={i.idIncidencia} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-800">{formatearFechaHora(i.fechaHora)}</td>
                    <td className="py-2 pr-3 text-slate-800">{i.tipoEvento.nombreTipoEvento}</td>
                    <td className="py-2 pr-3 text-slate-800">{i.nivelGravedad.nombreNivel}</td>
                    <td className="py-2 text-slate-800">{i.usuario.nombreCompleto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recientes.datos && recientes.datos.totalElementos > RECIENTES && (
            <p className="mt-2 text-xs text-slate-500">
              Mostrando {RECIENTES} de {recientes.datos.totalElementos}. El resto, en el historial.
            </p>
          )}
        </EstadoDatos>
      </Tarjeta>

      {reasignacion && (
        <ReasignarVigilante reasignacion={reasignacion} onGuardado={guardado} onCerrar={() => setReasignacion(null)} />
      )}
    </div>
  );
}

function VolverDashboard({ consulta }: { consulta: string }) {
  return (
    <Link
      href={consulta ? `/dashboard?${consulta}#despliegue` : "/dashboard#despliegue"}
      className="text-sm font-semibold text-blue-900 underline hover:text-blue-700"
    >
      ← Volver al dashboard
    </Link>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="inline font-semibold text-slate-600">{etiqueta}: </dt>
      <dd className="inline text-slate-800">{valor}</dd>
    </div>
  );
}
