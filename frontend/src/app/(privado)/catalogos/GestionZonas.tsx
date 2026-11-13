"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import { ESTILO_CAMPO } from "@/components/CampoTexto";
import DialogoConfirmacion from "@/components/DialogoConfirmacion";
import EstadoDatos from "@/components/EstadoDatos";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import Paginacion from "@/components/Paginacion";
import Tarjeta from "@/components/Tarjeta";
import {
  buscarZonas,
  cambiarEstadoZona,
  contarVigilantesActivos,
  listarRoles,
  ZONAS_POR_PAGINA_MAX,
} from "@/lib/servicios";
import type { FiltroZonas, Zona } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { ROL_VIGILANTE } from "@/lib/validaciones";
import FormularioZona from "./FormularioZona";

const FILTRO_VACIO: FiltroZonas = { nombre: "", departamento: "", provincia: "", distrito: "", activo: null, q: "" };
const ESTILO_FILTRO = `${ESTILO_CAMPO} border-slate-300 focus:border-blue-900 focus:ring-blue-900/20`;

type Dialogo = { tipo: "crear" } | { tipo: "editar" | "estado"; zona: Zona };

/** Departamentos, provincias y distritos ya usados, para los filtros (igualdad exacta) y las sugerencias del formulario. */
export interface Ubicaciones {
  departamentos: string[];
  provincias: string[];
  distritos: string[];
}

/** Valores distintos (sin distinguir mayúsculas) de un campo, ordenados. */
function unicos(zonas: Zona[], campo: "departamento" | "provincia" | "distrito"): string[] {
  const vistos = new Map<string, string>();
  for (const zona of zonas) {
    const valor = zona[campo].trim();
    if (valor && !vistos.has(valor.toLowerCase())) vistos.set(valor.toLowerCase(), valor);
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "es"));
}

function igual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Pestaña Zonas (RF-09): listado paginado con filtros por nombre, departamento, provincia, distrito, estado y texto
 * libre (referencia o descripción), alta y edición en un modal, y activación/desactivación con confirmación. Al
 * desactivar avisa cuántos vigilantes activos siguen asignados a la zona.
 */
export default function GestionZonas() {
  const [borrador, setBorrador] = useState<FiltroZonas>(FILTRO_VACIO);
  const [filtro, setFiltro] = useState<FiltroZonas>(FILTRO_VACIO);
  const [pagina, setPagina] = useState(0);
  const [tamano, setTamano] = useState(20);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Todas las zonas (activas e inactivas) para armar las opciones de ubicación.
  const cargarTodas = useCallback(() => buscarZonas(FILTRO_VACIO, 0, ZONAS_POR_PAGINA_MAX), []);
  const todas = useConsulta(cargarTodas);
  const lista = todas.datos?.contenido ?? [];
  const deDepartamento = lista.filter((z) => !borrador.departamento || igual(z.departamento, borrador.departamento));
  const deProvincia = deDepartamento.filter((z) => !borrador.provincia || igual(z.provincia, borrador.provincia));
  const ubicaciones: Ubicaciones = {
    departamentos: unicos(lista, "departamento"),
    provincias: unicos(lista, "provincia"),
    distritos: unicos(lista, "distrito"),
  };

  const cargarZonas = useCallback(() => buscarZonas(filtro, pagina, tamano), [filtro, pagina, tamano]);
  const zonas = useConsulta(cargarZonas);

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setFiltro({ ...borrador, nombre: borrador.nombre.trim(), q: borrador.q.trim() });
    setPagina(0);
  }

  function limpiar() {
    setBorrador(FILTRO_VACIO);
    setFiltro(FILTRO_VACIO);
    setPagina(0);
  }

  function terminar(mensaje: string) {
    setDialogo(null);
    setAviso(mensaje);
    zonas.recargar();
    todas.recargar();
  }

  function selectUbicacion(
    id: string,
    etiqueta: string,
    valor: string,
    opciones: string[],
    alCambiar: (valor: string) => void,
  ) {
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-700">
          {etiqueta}
        </label>
        <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} className={ESTILO_FILTRO}>
          <option value="">Todos</option>
          {opciones.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Una zona inactiva no se ofrece en los formularios, pero se conserva en el historial.
        </p>
        <Boton
          onClick={() => {
            setAviso(null);
            setDialogo({ tipo: "crear" });
          }}
        >
          + Nueva zona
        </Boton>
      </div>

      {aviso && <Alerta tipo="exito">{aviso}</Alerta>}

      <Tarjeta titulo="Filtros">
        <form onSubmit={buscar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="filtro-nombre" className="mb-1 block text-sm font-semibold text-slate-700">
              Nombre
            </label>
            <input
              id="filtro-nombre"
              type="search"
              value={borrador.nombre}
              onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
              placeholder="Contiene…"
              autoComplete="off"
              className={ESTILO_FILTRO}
            />
          </div>
          {selectUbicacion(
            "filtro-departamento",
            "Departamento",
            borrador.departamento,
            ubicaciones.departamentos,
            (v) => setBorrador({ ...borrador, departamento: v, provincia: "", distrito: "" }),
          )}
          {selectUbicacion(
            "filtro-provincia",
            "Provincia",
            borrador.provincia,
            unicos(deDepartamento, "provincia"),
            (v) => setBorrador({ ...borrador, provincia: v, distrito: "" }),
          )}
          {selectUbicacion("filtro-distrito", "Distrito", borrador.distrito, unicos(deProvincia, "distrito"), (v) =>
            setBorrador({ ...borrador, distrito: v }),
          )}
          <div>
            <label htmlFor="filtro-estado" className="mb-1 block text-sm font-semibold text-slate-700">
              Estado
            </label>
            <select
              id="filtro-estado"
              value={borrador.activo === null ? "" : String(borrador.activo)}
              onChange={(e) =>
                setBorrador({ ...borrador, activo: e.target.value === "" ? null : e.target.value === "true" })
              }
              className={ESTILO_FILTRO}
            >
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>
          <div>
            <label htmlFor="filtro-q" className="mb-1 block text-sm font-semibold text-slate-700">
              Texto libre
            </label>
            <input
              id="filtro-q"
              type="search"
              value={borrador.q}
              onChange={(e) => setBorrador({ ...borrador, q: e.target.value })}
              placeholder="En referencia o descripción"
              autoComplete="off"
              className={ESTILO_FILTRO}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3 lg:justify-end">
            <Boton variante="secundario" onClick={limpiar} className="py-2">
              Limpiar
            </Boton>
            <Boton type="submit" className="py-2">
              Buscar
            </Boton>
          </div>
        </form>
        {todas.error && (
          <p className="mt-2 text-xs text-amber-700">
            No se pudieron cargar las opciones de ubicación: {todas.error.mensaje}
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Zonas">
        <EstadoDatos
          cargando={zonas.cargando}
          error={zonas.error}
          vacio={!!zonas.datos && zonas.datos.contenido.length === 0}
          mensajeVacio="No hay zonas que cumplan los filtros."
          onReintentar={zonas.recargar}
        >
          {zonas.datos && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Nombre
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Ubicación
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Referencia
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Estado
                      </th>
                      <th scope="col" className="py-2 text-right font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {zonas.datos.contenido.map((z) => (
                      <tr key={z.idZona}>
                        <td className="py-2 pr-3 font-medium text-slate-800">{z.nombreZona}</td>
                        <td className="py-2 pr-3 text-slate-700">
                          {z.distrito}, {z.provincia}, {z.departamento}
                        </td>
                        <td className="max-w-xs truncate py-2 pr-3 text-slate-600" title={z.referencia ?? undefined}>
                          {z.referencia ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <EtiquetaEstado activo={z.estadoActivo} femenino />
                        </td>
                        <td className="py-2">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDialogo({ tipo: "editar", zona: z })}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDialogo({ tipo: "estado", zona: z })}
                              className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                                z.estadoActivo
                                  ? "border-red-200 text-red-700 hover:bg-red-50"
                                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {z.estadoActivo ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                pagina={zonas.datos.pagina}
                totalPaginas={zonas.datos.totalPaginas}
                totalElementos={zonas.datos.totalElementos}
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
      </Tarjeta>

      {(dialogo?.tipo === "crear" || dialogo?.tipo === "editar") && (
        <FormularioZona
          zona={dialogo.tipo === "editar" ? dialogo.zona : null}
          ubicaciones={ubicaciones}
          onGuardado={terminar}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "estado" && (
        <ConfirmarEstadoZona zona={dialogo.zona} onHecho={terminar} onCerrar={() => setDialogo(null)} />
      )}
    </div>
  );
}

/**
 * Confirmación de activar o desactivar una zona. Al desactivar consulta cuántos vigilantes activos tiene asignados
 * y avisa que siguen asignados y dejan de contarse en el despliegue hasta cambiarles la zona.
 */
function ConfirmarEstadoZona({
  zona,
  onHecho,
  onCerrar,
}: {
  zona: Zona;
  onHecho: (mensaje: string) => void;
  onCerrar: () => void;
}) {
  const desactivar = zona.estadoActivo;
  const cargarConteo = useCallback(async () => {
    if (!desactivar) return null;
    const idVigilante = (await listarRoles()).find((r) => r.nombreRol === ROL_VIGILANTE)?.idRol;
    if (idVigilante === undefined) throw new Error("Sin rol Vigilante");
    return contarVigilantesActivos(zona.idZona, idVigilante);
  }, [desactivar, zona.idZona]);
  const conteo = useConsulta(cargarConteo);

  let vigilantes: string;
  if (conteo.cargando) vigilantes = "Contando los vigilantes asignados…";
  else if (conteo.error || conteo.datos === null) vigilantes = "No se pudo contar a los vigilantes asignados.";
  else if (conteo.datos === 0) vigilantes = "No hay vigilantes activos asignados a esta zona.";
  else
    vigilantes = `Hay ${conteo.datos} ${conteo.datos === 1 ? "vigilante activo asignado" : "vigilantes activos asignados"} a esta zona.`;

  return (
    <DialogoConfirmacion
      titulo={desactivar ? "Desactivar zona" : "Activar zona"}
      textoConfirmar={desactivar ? "Desactivar" : "Activar"}
      variante={desactivar ? "peligro" : "primario"}
      onCerrar={onCerrar}
      onConfirmar={async () => {
        await cambiarEstadoZona(zona.idZona, !desactivar);
        onHecho(`La zona ${zona.nombreZona} quedó ${desactivar ? "inactiva" : "activa"}.`);
      }}
    >
      {desactivar ? (
        <>
          <p>
            <strong>{zona.nombreZona}</strong> dejará de ofrecerse en los formularios de registro y de personal. Sus
            incidencias se conservan en el historial.
          </p>
          <Alerta tipo="aviso">
            <p className="font-semibold" aria-live="polite">
              {vigilantes}
            </p>
            <p className="mt-1">
              Los vigilantes asignados siguen asignados a esta zona, pero dejan de contarse en el despliegue del
              dashboard hasta que les cambies la zona en{" "}
              <Link href="/personal" className="font-semibold underline">
                Personal
              </Link>
              .
            </p>
          </Alerta>
        </>
      ) : (
        <p>
          <strong>{zona.nombreZona}</strong> volverá a ofrecerse en los formularios y a contarse en el despliegue.
        </p>
      )}
    </DialogoConfirmacion>
  );
}
