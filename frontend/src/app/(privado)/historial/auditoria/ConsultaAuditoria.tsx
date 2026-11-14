"use client";

import { useCallback, useState, type FormEvent } from "react";
import Boton from "@/components/Boton";
import CampoDni from "@/components/CampoDni";
import EstadoDatos from "@/components/EstadoDatos";
import MotivoDesactivado, { textoMotivo } from "@/components/MotivoDesactivado";
import Paginacion from "@/components/Paginacion";
import SelectorPeriodo, { PERIODO_INICIAL } from "@/components/SelectorPeriodo";
import { formatearFechaHora } from "@/lib/fechas";
import { buscarAuditoria, listarAccionesAuditoria } from "@/lib/servicios";
import type { FiltroAuditoria, FiltroPeriodo, RegistroAuditoria } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { useValidacion } from "@/lib/useValidacion";
import { AYUDA_DNI_BUSQUEDA, validarDniBusqueda } from "@/lib/validaciones";
import DetalleAuditoria from "./DetalleAuditoria";

const FILTRO_INICIAL: FiltroAuditoria = { ...PERIODO_INICIAL, accion: "", q: "" };
const ORDEN = ["q"] as const;
const ETIQUETAS = { q: "DNI" } as const;

/**
 * Consulta de auditoría: filtros por periodo, acción y DNI (completo o sus primeros dígitos), tabla paginada en el
 * servidor y detalle de cada registro en texto legible.
 */
export default function ConsultaAuditoria() {
  const [filtro, setFiltro] = useState<FiltroAuditoria>(FILTRO_INICIAL);
  const [dni, setDni] = useState("");
  const [pagina, setPagina] = useState(0);
  const [tamano, setTamano] = useState(20);

  const errorDni = validarDniBusqueda(dni);
  const validacion = useValidacion(errorDni ? { q: errorDni } : {}, ORDEN);

  const acciones = useConsulta(listarAccionesAuditoria);
  const consulta = useConsulta(useCallback(() => buscarAuditoria(filtro, pagina, tamano), [filtro, pagina, tamano]));

  function aplicar(cambios: Partial<FiltroAuditoria>) {
    setFiltro((actual) => ({ ...actual, ...cambios }));
    setPagina(0);
  }

  function cambiarPeriodo(periodo: FiltroPeriodo) {
    aplicar({ periodo: periodo.periodo, desde: periodo.desde, hasta: periodo.hasta });
  }

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    if (!validacion.intentarEnviar()) return;
    aplicar({ q: dni.trim() });
  }

  function limpiar() {
    setDni("");
    validacion.reiniciar();
    aplicar({ accion: "", q: "" });
  }

  const motivoBloqueo = textoMotivo(validacion.primerErrorVisible(), ETIQUETAS);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-2xl font-bold text-blue-900">Auditoría</h1>
        <p className="mb-4 text-sm text-slate-500">
          Acciones críticas registradas por el sistema, de la más reciente a la más antigua. Consultar no genera
          registros.
        </p>
        <div className="space-y-3">
          <SelectorPeriodo valor={filtro} onCambio={cambiarPeriodo} />
          <form onSubmit={buscar} noValidate className="flex flex-wrap items-start gap-3">
            <div className="w-full sm:w-64">
              <label htmlFor="filtro-accion" className="mb-1 block text-sm font-semibold text-slate-700">
                Acción
              </label>
              <select
                id="filtro-accion"
                value={filtro.accion}
                disabled={acciones.cargando || !!acciones.error}
                onChange={(e) => aplicar({ accion: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20 disabled:bg-slate-100"
              >
                <option value="">Todas las acciones</option>
                {acciones.datos?.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.etiqueta}
                  </option>
                ))}
              </select>
              {acciones.error && (
                <p role="alert" className="mt-1 text-sm text-red-600">
                  No se pudieron cargar las acciones.{" "}
                  <button type="button" onClick={acciones.recargar} className="font-semibold underline">
                    Reintentar
                  </button>
                </p>
              )}
            </div>
            {/* Opcional y por prefijo: DNI completo o sus primeros dígitos (sin aviso por tener menos de 8). */}
            <div className="w-full sm:w-56">
              <CampoDni
                props={validacion.propsCampo("q")}
                valor={dni}
                onCambio={(valor) => {
                  setDni(valor);
                  validacion.alCambiar("q");
                }}
                error={validacion.error("q")}
                ayuda={AYUDA_DNI_BUSQUEDA}
                placeholder="Completo o primeros dígitos"
                className="px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 sm:mt-6">
              <Boton
                type="submit"
                className="py-2 text-sm"
                disabled={validacion.hayErroresVisibles}
                title={motivoBloqueo}
                aria-describedby={motivoBloqueo ? "motivo-auditoria" : undefined}
              >
                Buscar
              </Boton>
              {(filtro.accion || filtro.q || dni) && (
                <Boton variante="secundario" className="py-2 text-sm" onClick={limpiar}>
                  Limpiar
                </Boton>
              )}
            </div>
            <MotivoDesactivado id="motivo-auditoria" texto={motivoBloqueo} className="w-full" />
          </form>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <EstadoDatos
          cargando={consulta.cargando}
          error={consulta.error}
          vacio={consulta.datos?.contenido.length === 0}
          mensajeVacio="No hay registros de auditoría con estos filtros."
          onReintentar={consulta.recargar}
        >
          {consulta.datos && (
            <>
              <TablaAuditoria filas={consulta.datos.contenido} />
              <Paginacion
                pagina={consulta.datos.pagina}
                totalPaginas={consulta.datos.totalPaginas}
                totalElementos={consulta.datos.totalElementos}
                tamano={tamano}
                onPagina={setPagina}
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

function TablaAuditoria({ filas }: { filas: RegistroAuditoria[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            <th scope="col" className="py-2 pr-3 font-semibold">Fecha y hora</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Acción</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Usuario</th>
            <th scope="col" className="py-2 font-semibold">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.idAuditoria} className="border-b border-slate-100 align-top last:border-0">
              <td className="whitespace-nowrap py-2 pr-3 text-slate-800">{formatearFechaHora(fila.fechaHora)}</td>
              <td className="py-2 pr-3">
                <span className={fila.accion === "LOGIN_FALLIDO" ? "font-semibold text-red-600" : "text-slate-800"}>
                  {fila.accionEtiqueta}
                </span>
              </td>
              <td className="py-2 pr-3 text-slate-800">
                {fila.usuario ? (
                  <>
                    {fila.usuario.nombreCompleto}
                    <span className="block text-xs text-slate-500">DNI {fila.usuario.dni}</span>
                  </>
                ) : (
                  <span className="text-slate-500">No identificado</span>
                )}
                {fila.dniIntentado && (!fila.usuario || fila.usuario.dni !== fila.dniIntentado) && (
                  <span className="block text-xs text-slate-500">DNI intentado {fila.dniIntentado}</span>
                )}
              </td>
              <td className="py-2">
                <DetalleAuditoria detalle={fila.detalle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
