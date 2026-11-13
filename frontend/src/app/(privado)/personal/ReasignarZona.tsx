"use client";

import { useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import Modal from "@/components/Modal";
import { errorDeApi } from "@/lib/api";
import { actualizarUsuario } from "@/lib/servicios";
import type { RolCatalogo, UsuarioGestion, Zona } from "@/lib/tipos";
import { useValidacion } from "@/lib/useValidacion";
import { erroresDelServidor, MENSAJES, ROL_VIGILANTE, type Errores } from "@/lib/validaciones";
import CampoZona from "./CampoZona";
import { nombreCompleto } from "./nombreCompleto";

const ORDEN = ["idZona"] as const;
type Campo = (typeof ORDEN)[number];

interface Props {
  usuario: UsuarioGestion;
  roles: RolCatalogo[];
  zonas: Zona[];
  onZonasObsoletas: () => void;
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}

/**
 * Reasigna la zona de un usuario: envía `PUT /api/usuarios/{id}` con sus datos actuales y la zona nueva (sin
 * contraseña, que se conserva). Para el Vigilante la zona es obligatoria; la nueva debe estar activa.
 */
export default function ReasignarZona({ usuario, roles, zonas, onZonasObsoletas, onGuardado, onCerrar }: Props) {
  const [idZona, setIdZona] = useState<number | null>(usuario.idZona);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const esVigilante = (roles.find((r) => r.idRol === usuario.idRol)?.nombreRol ?? usuario.rol) === ROL_VIGILANTE;
  const errores: Errores<Campo> = esVigilante && idZona === null ? { idZona: MENSAJES.zonaVigilante } : {};
  const validacion = useValidacion(errores, ORDEN);
  const sinCambios = idZona === usuario.idZona;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    try {
      const guardado = await actualizarUsuario(usuario.idUsuario, {
        dni: usuario.dni,
        nombres: usuario.nombres,
        apellidoPaterno: usuario.apellidoPaterno,
        apellidoMaterno: usuario.apellidoMaterno,
        contrasena: null,
        idRol: usuario.idRol,
        idZona,
      });
      onGuardado(
        guardado.nombreZona
          ? `${nombreCompleto(guardado)} quedó asignado a ${guardado.nombreZona}.`
          : `${nombreCompleto(guardado)} quedó sin zona asignada.`,
      );
    } catch (e) {
      const errorApi = errorDeApi(e);
      const { campos, general } = erroresDelServidor<Campo>(errorApi, { idZona: "idZona" }, [
        { contiene: "zona", campo: "idZona" },
      ]);
      if (campos.idZona && errorApi.mensaje.includes("inactiva")) onZonasObsoletas();
      validacion.ponerErroresServidor(campos);
      setError(general);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Reasignar zona"
      subtitulo={`${nombreCompleto(usuario)} · ${usuario.rol}`}
      onCerrar={onCerrar}
      bloqueado={enviando}
      ancho="sm"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <p className="text-sm text-slate-600">
          Zona actual: <strong>{usuario.nombreZona ?? "sin zona"}</strong>. El cambio se refleja de inmediato en el
          despliegue por zona del dashboard.
        </p>
        <CampoZona
          props={validacion.propsCampo("idZona")}
          valor={idZona}
          onCambio={(v) => {
            setIdZona(v);
            validacion.alCambiar("idZona");
          }}
          zonas={zonas}
          actual={usuario.idZona !== null ? { idZona: usuario.idZona, nombreZona: usuario.nombreZona ?? "" } : null}
          obligatoria={esVigilante}
          error={validacion.error("idZona")}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando || sinCambios || validacion.hayErroresVisibles}>
            {enviando ? "Guardando…" : "Reasignar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
