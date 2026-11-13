"use client";

import { useCallback, useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import { ESTILO_CAMPO } from "@/components/CampoTexto";
import DialogoConfirmacion from "@/components/DialogoConfirmacion";
import EstadoDatos from "@/components/EstadoDatos";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import Paginacion from "@/components/Paginacion";
import Tarjeta from "@/components/Tarjeta";
import { useSesion } from "@/context/SesionContext";
import { buscarUsuarios, cambiarEstadoUsuario, listarRoles, listarZonasActivas } from "@/lib/servicios";
import type { FiltroUsuarios, UsuarioGestion } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import FormularioUsuario from "./FormularioUsuario";
import { nombreCompleto } from "./nombreCompleto";
import ReasignarZona from "./ReasignarZona";
import RestablecerContrasena from "./RestablecerContrasena";

const FILTRO_VACIO: FiltroUsuarios = { q: "", idRol: null, idZona: null, activo: null };
const ESTILO_FILTRO = `${ESTILO_CAMPO} border-slate-300 focus:border-blue-900 focus:ring-blue-900/20`;

/** Acción abierta sobre la tabla (un modal a la vez). */
type Dialogo = { tipo: "crear" } | { tipo: "editar" | "zona" | "contrasena" | "estado"; usuario: UsuarioGestion };

/** Texto de un `<select>` de número opcional: vacío = `null`. */
function numeroONulo(valor: string): number | null {
  return valor === "" ? null : Number(valor);
}

/**
 * Gestión de personal (RF-02): tabla paginada con búsqueda por DNI o nombre y filtros de rol, zona y estado;
 * alta, edición, reasignación de zona, restablecimiento de contraseña y activación/desactivación con confirmación.
 * El Administrador no puede desactivarse ni restablecer su propia contraseña desde aquí.
 */
export default function GestionPersonal() {
  const { sesion } = useSesion();
  const idPropio = sesion?.usuario.idUsuario ?? null;

  const [borrador, setBorrador] = useState<FiltroUsuarios>(FILTRO_VACIO);
  const [filtro, setFiltro] = useState<FiltroUsuarios>(FILTRO_VACIO);
  const [pagina, setPagina] = useState(0);
  const [tamano, setTamano] = useState(20);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargarCatalogos = useCallback(() => Promise.all([listarRoles(), listarZonasActivas()]), []);
  const catalogos = useConsulta(cargarCatalogos);
  const [roles, zonas] = catalogos.datos ?? [[], []];

  const cargarUsuarios = useCallback(() => buscarUsuarios(filtro, pagina, tamano), [filtro, pagina, tamano]);
  const usuarios = useConsulta(cargarUsuarios);

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setFiltro({ ...borrador, q: borrador.q.trim() });
    setPagina(0);
  }

  function limpiar() {
    setBorrador(FILTRO_VACIO);
    setFiltro(FILTRO_VACIO);
    setPagina(0);
  }

  /** Cierra el modal, muestra el mensaje y recarga la tabla sin perder los filtros. */
  function terminar(mensaje: string) {
    setDialogo(null);
    setAviso(mensaje);
    usuarios.recargar();
  }

  const listo = !catalogos.cargando && !catalogos.error;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Gestión de personal</h1>
          <p className="text-sm text-slate-500">Alta, edición, zona asignada y estado de los usuarios del sistema.</p>
        </div>
        <Boton
          onClick={() => {
            setAviso(null);
            setDialogo({ tipo: "crear" });
          }}
          disabled={!listo}
        >
          + Agregar personal
        </Boton>
      </div>

      {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
      {catalogos.error && (
        <Alerta tipo="error">
          No se pudieron cargar los roles y las zonas: {catalogos.error.mensaje}{" "}
          <button type="button" onClick={catalogos.recargar} className="font-semibold underline">
            Reintentar
          </button>
        </Alerta>
      )}

      <Tarjeta titulo="Filtros">
        <form onSubmit={buscar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="filtro-q" className="mb-1 block text-sm font-semibold text-slate-700">
              Buscar
            </label>
            <input
              id="filtro-q"
              type="search"
              value={borrador.q}
              onChange={(e) => setBorrador({ ...borrador, q: e.target.value })}
              placeholder="DNI, nombres o apellidos"
              autoComplete="off"
              className={ESTILO_FILTRO}
            />
          </div>
          <div>
            <label htmlFor="filtro-rol" className="mb-1 block text-sm font-semibold text-slate-700">
              Rol
            </label>
            <select
              id="filtro-rol"
              value={borrador.idRol ?? ""}
              onChange={(e) => setBorrador({ ...borrador, idRol: numeroONulo(e.target.value) })}
              className={ESTILO_FILTRO}
            >
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r.idRol} value={r.idRol}>
                  {r.nombreRol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-zona" className="mb-1 block text-sm font-semibold text-slate-700">
              Zona
            </label>
            <select
              id="filtro-zona"
              value={borrador.idZona ?? ""}
              onChange={(e) => setBorrador({ ...borrador, idZona: numeroONulo(e.target.value) })}
              className={ESTILO_FILTRO}
            >
              <option value="">Todas</option>
              {zonas.map((z) => (
                <option key={z.idZona} value={z.idZona}>
                  {z.nombreZona}
                </option>
              ))}
            </select>
          </div>
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
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5 lg:justify-end">
            <Boton variante="secundario" onClick={limpiar} className="py-2">
              Limpiar
            </Boton>
            <Boton type="submit" className="py-2">
              Buscar
            </Boton>
          </div>
        </form>
      </Tarjeta>

      <Tarjeta
        titulo="Personal"
        acciones={usuarios.actualizando ? <span className="text-xs text-slate-400">Actualizando…</span> : undefined}
      >
        <EstadoDatos
          cargando={usuarios.cargando}
          error={usuarios.error}
          vacio={!!usuarios.datos && usuarios.datos.contenido.length === 0}
          mensajeVacio="No hay usuarios que cumplan los filtros."
          onReintentar={usuarios.recargar}
        >
          {usuarios.datos && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Nombre
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        DNI
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Rol
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Zona
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
                    {usuarios.datos.contenido.map((u) => {
                      const propio = u.idUsuario === idPropio;
                      return (
                        <tr key={u.idUsuario} className={u.estadoActivo ? "" : "text-slate-400"}>
                          <td className="py-2 pr-3 text-slate-800">
                            {nombreCompleto(u)}
                            {propio && <span className="ml-2 text-xs font-semibold text-blue-900">(tú)</span>}
                          </td>
                          <td className="py-2 pr-3 font-mono text-slate-700">{u.dni}</td>
                          <td className="py-2 pr-3 text-slate-700">{u.rol}</td>
                          <td className="py-2 pr-3 text-slate-700">
                            {u.nombreZona ?? <span className="text-slate-400">Sin zona</span>}
                          </td>
                          <td className="py-2 pr-3">
                            <EtiquetaEstado activo={u.estadoActivo} />
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap justify-end gap-1">
                              <AccionFila onClick={() => setDialogo({ tipo: "editar", usuario: u })} disabled={!listo}>
                                Editar
                              </AccionFila>
                              <AccionFila onClick={() => setDialogo({ tipo: "zona", usuario: u })} disabled={!listo}>
                                Reasignar zona
                              </AccionFila>
                              <AccionFila
                                onClick={() => setDialogo({ tipo: "contrasena", usuario: u })}
                                disabled={propio}
                                title={propio ? "Para tu propia contraseña usa “Cambiar mi contraseña”" : undefined}
                              >
                                Restablecer contraseña
                              </AccionFila>
                              <AccionFila
                                onClick={() => setDialogo({ tipo: "estado", usuario: u })}
                                disabled={propio && u.estadoActivo}
                                title={propio && u.estadoActivo ? "No puedes desactivar tu propia cuenta" : undefined}
                                peligro={u.estadoActivo}
                              >
                                {u.estadoActivo ? "Desactivar" : "Activar"}
                              </AccionFila>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Paginacion
                pagina={usuarios.datos.pagina}
                totalPaginas={usuarios.datos.totalPaginas}
                totalElementos={usuarios.datos.totalElementos}
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
        <FormularioUsuario
          usuario={dialogo.tipo === "editar" ? dialogo.usuario : null}
          esPropio={dialogo.tipo === "editar" && dialogo.usuario.idUsuario === idPropio}
          roles={roles}
          zonas={zonas}
          onZonasObsoletas={catalogos.recargar}
          onGuardado={terminar}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "zona" && (
        <ReasignarZona
          usuario={dialogo.usuario}
          roles={roles}
          zonas={zonas}
          onZonasObsoletas={catalogos.recargar}
          onGuardado={terminar}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "contrasena" && (
        <RestablecerContrasena usuario={dialogo.usuario} onGuardado={terminar} onCerrar={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === "estado" && (
        <DialogoConfirmacion
          titulo={dialogo.usuario.estadoActivo ? "Desactivar usuario" : "Activar usuario"}
          textoConfirmar={dialogo.usuario.estadoActivo ? "Desactivar" : "Activar"}
          variante={dialogo.usuario.estadoActivo ? "peligro" : "primario"}
          onCerrar={() => setDialogo(null)}
          onConfirmar={async () => {
            const { usuario } = dialogo;
            await cambiarEstadoUsuario(usuario.idUsuario, !usuario.estadoActivo);
            terminar(`${nombreCompleto(usuario)} quedó ${usuario.estadoActivo ? "inactivo" : "activo"}.`);
          }}
        >
          {dialogo.usuario.estadoActivo ? (
            <p>
              <strong>{nombreCompleto(dialogo.usuario)}</strong> (DNI {dialogo.usuario.dni}) ya no podrá iniciar sesión.
              Sus incidencias y su historial se conservan, y puedes volver a activarlo cuando quieras.
            </p>
          ) : (
            <p>
              <strong>{nombreCompleto(dialogo.usuario)}</strong> (DNI {dialogo.usuario.dni}) podrá volver a iniciar
              sesión con su contraseña actual.
            </p>
          )}
        </DialogoConfirmacion>
      )}
    </div>
  );
}

interface PropsAccion {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  peligro?: boolean;
  children: string;
}

function AccionFila({ onClick, disabled, title, peligro, children }: PropsAccion) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        peligro ? "border-red-200 text-red-700 hover:bg-red-50" : "border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
