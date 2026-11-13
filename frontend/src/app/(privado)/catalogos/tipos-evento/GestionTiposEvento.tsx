"use client";

import { useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import CampoTexto from "@/components/CampoTexto";
import DialogoConfirmacion from "@/components/DialogoConfirmacion";
import EstadoDatos from "@/components/EstadoDatos";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import Modal from "@/components/Modal";
import Tarjeta from "@/components/Tarjeta";
import { errorDeApi } from "@/lib/api";
import { actualizarTipoEvento, cambiarEstadoTipoEvento, crearTipoEvento, listarTiposEvento } from "@/lib/servicios";
import type { TipoEvento } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { useValidacion } from "@/lib/useValidacion";
import {
  erroresDelServidor,
  esTipoOtro,
  TIPO_EVENTO_MAX,
  TIPO_OTRO,
  validarTipoEvento,
  type CamposTipoEvento,
} from "@/lib/validaciones";

type Dialogo = { tipo: "crear" } | { tipo: "editar" | "estado"; tipoEvento: TipoEvento };

/**
 * Pestaña Tipos de evento (RF-09): lista de todos los tipos (activos e inactivos), alta, renombrado y
 * activación/desactivación con confirmación. "Otro" no se puede renombrar porque la regla de descripción mínima
 * del registro depende de su nombre.
 */
export default function GestionTiposEvento() {
  const tipos = useConsulta(listarTiposEvento);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function terminar(mensaje: string) {
    setDialogo(null);
    setAviso(mensaje);
    tipos.recargar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Los tipos activos aparecen en el formulario de registro de incidencias.
        </p>
        <Boton
          onClick={() => {
            setAviso(null);
            setDialogo({ tipo: "crear" });
          }}
        >
          + Nuevo tipo
        </Boton>
      </div>
      {aviso && <Alerta tipo="exito">{aviso}</Alerta>}

      <Tarjeta titulo="Tipos de evento">
        <EstadoDatos
          cargando={tipos.cargando}
          error={tipos.error}
          vacio={!!tipos.datos && tipos.datos.length === 0}
          mensajeVacio="No hay tipos de evento."
          onReintentar={tipos.recargar}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Nombre
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
                {tipos.datos?.map((t) => {
                  const otro = esTipoOtro(t.nombreTipoEvento);
                  return (
                    <tr key={t.idTipoEvento}>
                      <td className="py-2 pr-3 font-medium text-slate-800">
                        {t.nombreTipoEvento}
                        {otro && (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            (no se puede renombrar: exige descripción de 20 caracteres)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <EtiquetaEstado activo={t.estadoActivo} />
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDialogo({ tipo: "editar", tipoEvento: t })}
                            disabled={otro}
                            title={otro ? `El tipo "${TIPO_OTRO}" no se puede renombrar` : undefined}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDialogo({ tipo: "estado", tipoEvento: t })}
                            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                              t.estadoActivo
                                ? "border-red-200 text-red-700 hover:bg-red-50"
                                : "border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {t.estadoActivo ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </EstadoDatos>
      </Tarjeta>

      {(dialogo?.tipo === "crear" || dialogo?.tipo === "editar") && (
        <FormularioTipoEvento
          tipoEvento={dialogo.tipo === "editar" ? dialogo.tipoEvento : null}
          onGuardado={terminar}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "estado" && (
        <DialogoConfirmacion
          titulo={dialogo.tipoEvento.estadoActivo ? "Desactivar tipo de evento" : "Activar tipo de evento"}
          textoConfirmar={dialogo.tipoEvento.estadoActivo ? "Desactivar" : "Activar"}
          variante={dialogo.tipoEvento.estadoActivo ? "peligro" : "primario"}
          onCerrar={() => setDialogo(null)}
          onConfirmar={async () => {
            const t = dialogo.tipoEvento;
            await cambiarEstadoTipoEvento(t.idTipoEvento, !t.estadoActivo);
            terminar(`El tipo ${t.nombreTipoEvento} quedó ${t.estadoActivo ? "inactivo" : "activo"}.`);
          }}
        >
          <p>
            {dialogo.tipoEvento.estadoActivo ? (
              <>
                <strong>{dialogo.tipoEvento.nombreTipoEvento}</strong> dejará de ofrecerse al registrar incidencias. Las
                incidencias ya registradas con este tipo se conservan.
              </>
            ) : (
              <>
                <strong>{dialogo.tipoEvento.nombreTipoEvento}</strong> volverá a ofrecerse al registrar incidencias.
              </>
            )}
          </p>
        </DialogoConfirmacion>
      )}
    </div>
  );
}

const ORDEN = ["nombreTipoEvento"] as const;

/** Alta o renombrado de un tipo de evento (hasta 30 caracteres, único sin distinguir mayúsculas). */
function FormularioTipoEvento({
  tipoEvento,
  onGuardado,
  onCerrar,
}: {
  tipoEvento: TipoEvento | null;
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}) {
  const crear = tipoEvento === null;
  const [campos, setCampos] = useState<CamposTipoEvento>({ nombreTipoEvento: tipoEvento?.nombreTipoEvento ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const validacion = useValidacion(validarTipoEvento(campos), ORDEN);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    const nombre = campos.nombreTipoEvento.trim();
    try {
      const guardado = crear
        ? await crearTipoEvento(nombre)
        : await actualizarTipoEvento(tipoEvento.idTipoEvento, nombre);
      onGuardado(
        crear
          ? `Se creó el tipo ${guardado.nombreTipoEvento}. Ya aparece en el formulario de registro.`
          : `El tipo se renombró a ${guardado.nombreTipoEvento}.`,
      );
    } catch (e) {
      const { campos: porCampo, general } = erroresDelServidor(
        errorDeApi(e),
        { nombreTipoEvento: "nombreTipoEvento" },
        [
          {
            contiene: "Ya existe un tipo",
            campo: "nombreTipoEvento",
            mensaje: "Ya existe un tipo de evento con este nombre",
          },
          { contiene: "no se puede renombrar", campo: "nombreTipoEvento" },
        ],
      );
      validacion.ponerErroresServidor(porCampo);
      setError(general);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={crear ? "Nuevo tipo de evento" : "Renombrar tipo de evento"}
      subtitulo={tipoEvento?.nombreTipoEvento}
      onCerrar={onCerrar}
      bloqueado={enviando}
      ancho="sm"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <CampoTexto
          etiqueta="Nombre"
          props={validacion.propsCampo("nombreTipoEvento")}
          valor={campos.nombreTipoEvento}
          onCambio={(v) => {
            setCampos({ nombreTipoEvento: v });
            validacion.alCambiar("nombreTipoEvento");
          }}
          error={validacion.error("nombreTipoEvento")}
          ayuda={`Hasta ${TIPO_EVENTO_MAX} caracteres; no puede repetirse.`}
          maxLength={TIPO_EVENTO_MAX}
          autoComplete="off"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando || validacion.hayErroresVisibles}>
            {enviando ? "Guardando…" : crear ? "Crear tipo" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
