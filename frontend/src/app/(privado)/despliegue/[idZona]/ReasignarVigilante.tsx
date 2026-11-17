"use client";

import { useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import DialogoConfirmacion from "@/components/DialogoConfirmacion";
import Modal from "@/components/Modal";
import SelectorBuscable, { type OpcionBuscable } from "@/components/SelectorBuscable";
import { reasignarZonaVigilante } from "@/lib/servicios";
import type { VigilanteZona, Zona } from "@/lib/tipos";
import { useValidacion } from "@/lib/useValidacion";
import { validarReasignacion, type CampoReasignacion } from "@/lib/validaciones";
import { nombreCompleto } from "../../personal/nombreCompleto";

/**
 * Qué se reasigna: mover a un vigilante de esta zona a otra (`mover`, se elige la zona destino) o traer a esta zona
 * un vigilante de otra (`traer`, se elige el vigilante).
 */
export type Reasignacion =
  | { tipo: "mover"; vigilante: VigilanteZona; zonas: Zona[] }
  | { tipo: "traer"; zona: Zona; vigilantes: VigilanteZona[] };

interface Props {
  reasignacion: Reasignacion;
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}

/**
 * Reasignación de zona en dos pasos: elegir (zona destino o vigilante, con buscador y aviso bajo el campo) y
 * confirmar. Envía `PATCH /api/usuarios/{id}/zona`; si la API lo rechaza (p. ej. la zona se desactivó entretanto),
 * el motivo aparece en la confirmación. Las incidencias pasadas del vigilante no cambian de zona.
 */
export default function ReasignarVigilante({ reasignacion, onGuardado, onCerrar }: Props) {
  const campo: CampoReasignacion = reasignacion.tipo === "mover" ? "idZona" : "idUsuario";
  const [elegido, setElegido] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const validacion = useValidacion(validarReasignacion(campo, elegido), [campo]);

  const opciones: OpcionBuscable[] =
    reasignacion.tipo === "mover"
      ? reasignacion.zonas
          .filter((z) => z.idZona !== reasignacion.vigilante.idZona)
          .map((z) => ({
            valor: z.idZona,
            etiqueta: z.nombreZona,
            detalle: z.distrito,
            busqueda: `${z.provincia} ${z.referencia ?? ""}`,
          }))
      : reasignacion.vigilantes
          .filter((v) => v.idZona !== reasignacion.zona.idZona)
          .map((v) => ({
            valor: v.idUsuario,
            etiqueta: nombreCompleto(v),
            detalle: v.nombreZona ? `Zona actual: ${v.nombreZona}` : "Sin zona",
          }));

  // Vigilante, zona de origen y zona de destino del cambio elegido
  const vigilante =
    reasignacion.tipo === "mover"
      ? reasignacion.vigilante
      : reasignacion.vigilantes.find((v) => v.idUsuario === elegido);
  const origen = vigilante?.nombreZona ?? "sin zona";
  const destino =
    reasignacion.tipo === "mover"
      ? reasignacion.zonas.find((z) => z.idZona === elegido)
      : reasignacion.zona;

  function continuar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (validacion.intentarEnviar()) setConfirmando(true);
  }

  async function confirmar() {
    if (!vigilante || !destino) return;
    await reasignarZonaVigilante(vigilante.idUsuario, destino.idZona);
    onGuardado(`${nombreCompleto(vigilante)} quedó asignado a ${destino.nombreZona}.`);
  }

  if (confirmando && vigilante && destino) {
    return (
      <DialogoConfirmacion
        titulo="Confirmar reasignación"
        textoConfirmar="Reasignar"
        variante="primario"
        onConfirmar={confirmar}
        onCerrar={onCerrar}
      >
        <p>
          ¿Mover a <strong>{nombreCompleto(vigilante)}</strong> de <strong>{origen}</strong> a{" "}
          <strong>{destino.nombreZona}</strong>?
        </p>
        <p className="text-slate-600">
          Sus incidencias ya registradas se quedan en {origen}. Desde ahora solo podrá registrar en{" "}
          {destino.nombreZona}.
        </p>
      </DialogoConfirmacion>
    );
  }

  const titulo = reasignacion.tipo === "mover" ? "Mover a otra zona" : "Asignar vigilante de otra zona";
  const subtitulo =
    reasignacion.tipo === "mover"
      ? `${nombreCompleto(reasignacion.vigilante)} · ${origen}`
      : `Destino: ${reasignacion.zona.nombreZona}`;

  return (
    <Modal titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho="sm">
      <form onSubmit={continuar} noValidate className="space-y-4">
        {opciones.length === 0 ? (
          <Alerta tipo="aviso">
            {reasignacion.tipo === "mover"
              ? "No hay otras zonas activas a las que moverlo."
              : "No hay vigilantes activos en otras zonas."}
          </Alerta>
        ) : (
          <SelectorBuscable
            titulo={reasignacion.tipo === "mover" ? "Zona destino" : "Vigilante"}
            campo={campo}
            placeholder={reasignacion.tipo === "mover" ? "Elige una zona" : "Elige un vigilante"}
            placeholderBusqueda={
              reasignacion.tipo === "mover" ? "Buscar por nombre, distrito o referencia…" : "Buscar por nombre o zona…"
            }
            opciones={opciones}
            valor={elegido}
            onCambio={(valor) => {
              setElegido(valor);
              validacion.alCambiar(campo);
            }}
            error={validacion.error(campo)}
            onSalir={() => validacion.alSalir(campo)}
            refPrimero={validacion.registrar(campo)}
          />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={opciones.length === 0 || validacion.hayErroresVisibles}>
            Continuar
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
