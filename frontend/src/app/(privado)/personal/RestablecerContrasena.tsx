"use client";

import { useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import CampoTexto from "@/components/CampoTexto";
import Modal from "@/components/Modal";
import { errorDeApi } from "@/lib/api";
import { restablecerContrasena } from "@/lib/servicios";
import type { UsuarioGestion } from "@/lib/tipos";
import { useValidacion } from "@/lib/useValidacion";
import {
  CONTRASENA_MAX,
  CONTRASENA_MIN,
  erroresDelServidor,
  validarRestablecer,
  type CamposRestablecer,
} from "@/lib/validaciones";
import { nombreCompleto } from "./nombreCompleto";

type Campo = keyof CamposRestablecer;
const ORDEN: readonly Campo[] = ["nueva", "confirmacion"];

interface Props {
  usuario: UsuarioGestion;
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}

/**
 * El Administrador asigna una contraseña temporal nueva a otro usuario (`PATCH /api/usuarios/{id}/contrasena`,
 * 204) sin conocer la actual; el usuario deberá cambiarla en su siguiente ingreso. No se ofrece sobre la propia
 * cuenta (el backend también lo rechaza con 400).
 */
export default function RestablecerContrasena({ usuario, onGuardado, onCerrar }: Props) {
  const [campos, setCampos] = useState<CamposRestablecer>({ nueva: "", confirmacion: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const validacion = useValidacion(validarRestablecer(campos), ORDEN);

  function cambiar(campo: Campo, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    validacion.alCambiar(campo);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    try {
      // La contraseña no se recorta: un espacio al inicio o al final es parte de ella.
      await restablecerContrasena(usuario.idUsuario, campos.nueva);
      onGuardado(
        `Se restableció la contraseña de ${nombreCompleto(usuario)}. Es temporal: deberá cambiarla al ingresar.`,
      );
    } catch (e) {
      const { campos: porCampo, general } = erroresDelServidor(errorDeApi(e), { contrasenaNueva: "nueva" });
      validacion.ponerErroresServidor(porCampo);
      setError(general);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Restablecer contraseña"
      subtitulo={`${nombreCompleto(usuario)} · DNI ${usuario.dni}`}
      onCerrar={onCerrar}
      bloqueado={enviando}
      ancho="sm"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <Alerta tipo="aviso">
          Asigna una contraseña temporal. El usuario deberá cambiarla en su próximo ingreso; su contraseña anterior deja
          de funcionar.
        </Alerta>
        <CampoTexto
          etiqueta="Nueva contraseña temporal"
          type="password"
          props={validacion.propsCampo("nueva")}
          valor={campos.nueva}
          onCambio={(v) => cambiar("nueva", v)}
          error={validacion.error("nueva")}
          ayuda={`Entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres.`}
          autoComplete="new-password"
        />
        <CampoTexto
          etiqueta="Confirma la contraseña"
          type="password"
          props={validacion.propsCampo("confirmacion")}
          valor={campos.confirmacion}
          onCambio={(v) => cambiar("confirmacion", v)}
          error={validacion.error("confirmacion")}
          autoComplete="new-password"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando || validacion.hayErroresVisibles}>
            {enviando ? "Guardando…" : "Restablecer"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
