"use client";

import { useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import CampoTexto from "@/components/CampoTexto";
import EstadoDatos from "@/components/EstadoDatos";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import Modal from "@/components/Modal";
import Tarjeta from "@/components/Tarjeta";
import { errorDeApi } from "@/lib/api";
import { coloresGravedad } from "@/lib/gravedad";
import { actualizarNivel, listarNiveles } from "@/lib/servicios";
import type { NivelGravedad } from "@/lib/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { useValidacion } from "@/lib/useValidacion";
import {
  erroresDelServidor,
  NIVEL_NOMBRE_MAX,
  ORDEN_MAX,
  ORDEN_MIN,
  validarNivel,
  type CamposNivel,
} from "@/lib/validaciones";

/**
 * Pestaña Niveles de gravedad (RF-09): lista de menos a más grave y edición de nombre y orden. No hay alta ni
 * desactivación. Si el orden elegido ya lo tiene otro nivel, el backend intercambia los dos.
 */
export default function GestionNiveles() {
  const niveles = useConsulta(listarNiveles);
  const [editando, setEditando] = useState<NivelGravedad | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        El orden define la escala (1 = menos grave) y los colores del dashboard y del registro.
      </p>
      {aviso && <Alerta tipo="exito">{aviso}</Alerta>}

      <Tarjeta titulo="Niveles de gravedad">
        <EstadoDatos
          cargando={niveles.cargando}
          error={niveles.error}
          vacio={!!niveles.datos && niveles.datos.length === 0}
          mensajeVacio="No hay niveles de gravedad."
          onReintentar={niveles.recargar}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Orden
                  </th>
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
                {niveles.datos?.map((n) => (
                  <tr key={n.idNivelGravedad}>
                    <td className="py-2 pr-3 font-mono text-slate-700">{n.orden}</td>
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      <span
                        className="mr-2 inline-block size-3 rounded-full align-middle"
                        style={{ backgroundColor: coloresGravedad(n.orden).hex }}
                        aria-hidden="true"
                      />
                      {n.nombreNivel}
                    </td>
                    <td className="py-2 pr-3">
                      <EtiquetaEstado activo={n.estadoActivo} />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null);
                          setEditando(n);
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </EstadoDatos>
      </Tarjeta>

      {editando && (
        <FormularioNivel
          nivel={editando}
          niveles={niveles.datos ?? []}
          onGuardado={(mensaje) => {
            setEditando(null);
            setAviso(mensaje);
            niveles.recargar();
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

const ORDEN_CAMPOS: readonly (keyof CamposNivel)[] = ["nombreNivel", "orden"];

/** Edición de nombre (hasta 20) y orden (entero desde 1) de un nivel; avisa con qué nivel se intercambiará el orden. */
function FormularioNivel({
  nivel,
  niveles,
  onGuardado,
  onCerrar,
}: {
  nivel: NivelGravedad;
  niveles: NivelGravedad[];
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}) {
  const [campos, setCampos] = useState<CamposNivel>({ nombreNivel: nivel.nombreNivel, orden: String(nivel.orden) });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const validacion = useValidacion(validarNivel(campos), ORDEN_CAMPOS);

  const ordenNuevo = Number(campos.orden);
  const intercambio = niveles.find((n) => n.orden === ordenNuevo && n.idNivelGravedad !== nivel.idNivelGravedad);

  function cambiar(campo: keyof CamposNivel, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    validacion.alCambiar(campo);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    try {
      const guardado = await actualizarNivel(nivel.idNivelGravedad, campos.nombreNivel.trim(), ordenNuevo);
      onGuardado(
        intercambio
          ? `${guardado.nombreNivel} quedó con el orden ${guardado.orden} y ${intercambio.nombreNivel} pasó al ${nivel.orden}.`
          : `Se guardó el nivel ${guardado.nombreNivel}.`,
      );
    } catch (e) {
      const { campos: porCampo, general } = erroresDelServidor(
        errorDeApi(e),
        { nombreNivel: "nombreNivel", orden: "orden" },
        [{ contiene: "Ya existe un nivel", campo: "nombreNivel", mensaje: "Ya existe un nivel con este nombre" }],
      );
      validacion.ponerErroresServidor(porCampo);
      setError(general);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Editar nivel de gravedad"
      subtitulo={nivel.nombreNivel}
      onCerrar={onCerrar}
      bloqueado={enviando}
      ancho="sm"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <CampoTexto
          etiqueta="Nombre"
          props={validacion.propsCampo("nombreNivel")}
          valor={campos.nombreNivel}
          onCambio={(v) => cambiar("nombreNivel", v)}
          error={validacion.error("nombreNivel")}
          maxLength={NIVEL_NOMBRE_MAX}
          ayuda={`Hasta ${NIVEL_NOMBRE_MAX} caracteres; no puede repetirse.`}
          autoComplete="off"
        />
        <CampoTexto
          etiqueta="Orden"
          type="number"
          inputMode="numeric"
          min={ORDEN_MIN}
          max={ORDEN_MAX}
          step={1}
          props={validacion.propsCampo("orden")}
          valor={campos.orden}
          onCambio={(v) => cambiar("orden", v)}
          error={validacion.error("orden")}
          ayuda="1 = menos grave. Si otro nivel tiene ese orden, se intercambian."
        />
        {intercambio && !validacion.error("orden") && (
          <Alerta tipo="aviso">
            {intercambio.nombreNivel} tiene el orden {ordenNuevo}: pasará al orden {nivel.orden}.
          </Alerta>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando || validacion.hayErroresVisibles}>
            {enviando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
