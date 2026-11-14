"use client";

import { useState, type FormEvent } from "react";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import CampoDni from "@/components/CampoDni";
import CampoTexto, { describirCampo, ESTILO_CAMPO, EnvolturaCampo } from "@/components/CampoTexto";
import { bordeCampo } from "@/components/MensajeCampo";
import Modal from "@/components/Modal";
import MotivoDesactivado, { textoMotivo } from "@/components/MotivoDesactivado";
import { errorDeApi } from "@/lib/api";
import { actualizarUsuario, crearUsuario } from "@/lib/servicios";
import type { RolCatalogo, UsuarioGestion, UsuarioRequest, Zona } from "@/lib/tipos";
import { useValidacion } from "@/lib/useValidacion";
import {
  APELLIDO_MAX,
  CONTRASENA_MAX,
  CONTRASENA_MIN,
  erroresDelServidor,
  NOMBRES_MAX,
  ROL_VIGILANTE,
  validarUsuario,
  type CampoUsuario,
  type CamposUsuario,
  type ReglaServidor,
} from "@/lib/validaciones";
import CampoZona from "./CampoZona";
import { nombreCompleto } from "./nombreCompleto";

const ORDEN: readonly CampoUsuario[] = [
  "dni",
  "nombres",
  "apellidoPaterno",
  "apellidoMaterno",
  "idRol",
  "idZona",
  "contrasena",
  "confirmacion",
];

/** Nombre visible de cada campo, para explicar por qué el botón de guardar está desactivado. */
const ETIQUETAS: Record<CampoUsuario, string> = {
  dni: "DNI",
  nombres: "Nombres",
  apellidoPaterno: "Apellido paterno",
  apellidoMaterno: "Apellido materno",
  idRol: "Rol",
  idZona: "Zona",
  contrasena: "Contraseña temporal",
  confirmacion: "Confirma la contraseña",
};

/** Campo del DTO (`"dni: debe tener 8 dígitos"`) → campo del formulario. */
const MAPA_SERVIDOR: Record<string, CampoUsuario> = {
  dni: "dni",
  nombres: "nombres",
  apellidoPaterno: "apellidoPaterno",
  apellidoMaterno: "apellidoMaterno",
  contrasena: "contrasena",
  idRol: "idRol",
  idZona: "idZona",
};

/** Reglas de negocio de `UsuarioService` (400/409 sin detalles) que se muestran bajo su campo. */
const REGLAS_USUARIO: ReglaServidor<CampoUsuario>[] = [
  { contiene: "Ya existe un usuario con el DNI", campo: "dni", mensaje: "Ya existe un usuario con este DNI" },
  { contiene: "zona", campo: "idZona" },
  { contiene: "rol", campo: "idRol" },
];

interface Props {
  /** `null` para crear. */
  usuario: UsuarioGestion | null;
  /** El Administrador se está editando a sí mismo: no puede cambiarse el rol. */
  esPropio: boolean;
  roles: RolCatalogo[];
  zonas: Zona[];
  /** Se llama si el backend dice que la zona elegida ya no está activa (para recargar la lista). */
  onZonasObsoletas: () => void;
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}

function camposIniciales(usuario: UsuarioGestion | null): CamposUsuario {
  return {
    dni: usuario?.dni ?? "",
    nombres: usuario?.nombres ?? "",
    apellidoPaterno: usuario?.apellidoPaterno ?? "",
    apellidoMaterno: usuario?.apellidoMaterno ?? "",
    contrasena: "",
    confirmacion: "",
    idRol: usuario?.idRol ?? null,
    idZona: usuario?.idZona ?? null,
  };
}

/**
 * Alta y edición de un usuario en un modal. Al crear pide una contraseña temporal con confirmación (el usuario
 * deberá cambiarla en su primer ingreso); al editar no la pide: para eso está "Restablecer contraseña". La zona es
 * obligatoria si el rol es Vigilante. Los errores del backend (DNI duplicado 409, zona inactiva, quitarse el rol
 * de Administrador) aparecen bajo su campo.
 */
export default function FormularioUsuario({
  usuario,
  esPropio,
  roles,
  zonas,
  onZonasObsoletas,
  onGuardado,
  onCerrar,
}: Props) {
  const crear = usuario === null;
  const [campos, setCampos] = useState<CamposUsuario>(() => camposIniciales(usuario));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const esVigilante = roles.find((r) => r.idRol === campos.idRol)?.nombreRol === ROL_VIGILANTE;
  const validacion = useValidacion(validarUsuario(campos, esVigilante, crear), ORDEN);

  function cambiar<C extends CampoUsuario>(campo: C, valor: CamposUsuario[C]) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    validacion.alCambiar(campo);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    const cuerpo: UsuarioRequest = {
      dni: campos.dni.trim(),
      nombres: campos.nombres.trim(),
      apellidoPaterno: campos.apellidoPaterno.trim(),
      apellidoMaterno: campos.apellidoMaterno.trim() || null,
      // Al editar se envía null: el backend conserva la contraseña actual.
      contrasena: crear ? campos.contrasena : null,
      idRol: campos.idRol as number,
      idZona: campos.idZona,
    };
    try {
      const guardado = crear ? await crearUsuario(cuerpo) : await actualizarUsuario(usuario.idUsuario, cuerpo);
      onGuardado(
        crear
          ? `Se creó a ${nombreCompleto(guardado)}. Su contraseña es temporal: deberá cambiarla en su primer ingreso.`
          : `Se guardaron los cambios de ${nombreCompleto(guardado)}.`,
      );
    } catch (e) {
      const errorApi = errorDeApi(e);
      const { campos: porCampo, general } = erroresDelServidor(errorApi, MAPA_SERVIDOR, REGLAS_USUARIO);
      if (porCampo.idZona && errorApi.mensaje.includes("inactiva")) onZonasObsoletas();
      validacion.ponerErroresServidor(porCampo);
      setError(general);
      setEnviando(false);
    }
  }

  const propsRol = validacion.propsCampo("idRol");
  const errorRol = validacion.error("idRol");
  const motivoBloqueo = enviando ? undefined : textoMotivo(validacion.primerErrorVisible(), ETIQUETAS);

  return (
    <Modal
      titulo={crear ? "Agregar personal" : "Editar usuario"}
      subtitulo={usuario ? `${nombreCompleto(usuario)} · DNI ${usuario.dni}` : undefined}
      onCerrar={onCerrar}
      bloqueado={enviando}
      ancho="lg"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoDni
            props={validacion.propsCampo("dni")}
            valor={campos.dni}
            onCambio={(dni) => cambiar("dni", dni)}
            error={validacion.error("dni")}
            className="px-3 py-2.5"
          />
          <CampoTexto
            etiqueta="Nombres"
            props={validacion.propsCampo("nombres")}
            valor={campos.nombres}
            onCambio={(v) => cambiar("nombres", v)}
            error={validacion.error("nombres")}
            maxLength={NOMBRES_MAX}
            autoComplete="off"
          />
          <CampoTexto
            etiqueta="Apellido paterno"
            props={validacion.propsCampo("apellidoPaterno")}
            valor={campos.apellidoPaterno}
            onCambio={(v) => cambiar("apellidoPaterno", v)}
            error={validacion.error("apellidoPaterno")}
            maxLength={APELLIDO_MAX}
            autoComplete="off"
          />
          <CampoTexto
            etiqueta="Apellido materno"
            opcional
            props={validacion.propsCampo("apellidoMaterno")}
            valor={campos.apellidoMaterno}
            onCambio={(v) => cambiar("apellidoMaterno", v)}
            error={validacion.error("apellidoMaterno")}
            maxLength={APELLIDO_MAX}
            autoComplete="off"
          />

          <EnvolturaCampo
            etiqueta="Rol"
            campo="idRol"
            error={errorRol}
            ayuda={esPropio ? "No puedes quitarte el rol de Administrador." : undefined}
          >
            <select
              {...propsRol}
              aria-describedby={describirCampo(propsRol, esPropio)}
              name="idRol"
              value={campos.idRol ?? ""}
              disabled={esPropio}
              onChange={(e) => cambiar("idRol", e.target.value === "" ? null : Number(e.target.value))}
              className={`${ESTILO_CAMPO} ${bordeCampo(!!errorRol)} disabled:bg-slate-100`}
            >
              <option value="">Elige un rol</option>
              {roles.map((r) => (
                <option key={r.idRol} value={r.idRol}>
                  {r.nombreRol}
                </option>
              ))}
            </select>
          </EnvolturaCampo>

          <CampoZona
            props={validacion.propsCampo("idZona")}
            valor={campos.idZona}
            onCambio={(v) => cambiar("idZona", v)}
            zonas={zonas}
            actual={usuario?.idZona != null ? { idZona: usuario.idZona, nombreZona: usuario.nombreZona ?? "" } : null}
            obligatoria={esVigilante}
            error={validacion.error("idZona")}
          />
        </div>

        {crear && (
          <fieldset className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <legend className="px-1 text-sm font-semibold text-amber-900">Contraseña temporal</legend>
            <p className="text-sm text-amber-900">
              La contraseña que asignes es temporal: el usuario deberá cambiarla en su primer ingreso. Entrégasela por
              un medio seguro.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Contraseña temporal"
                type="password"
                props={validacion.propsCampo("contrasena")}
                valor={campos.contrasena}
                onCambio={(v) => cambiar("contrasena", v)}
                error={validacion.error("contrasena")}
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
            </div>
          </fieldset>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            disabled={enviando || validacion.hayErroresVisibles}
            title={motivoBloqueo}
            aria-describedby={motivoBloqueo ? "motivo-usuario" : undefined}
          >
            {enviando ? "Guardando…" : crear ? "Crear usuario" : "Guardar cambios"}
          </Boton>
          {/* Último en el DOM: en el celular (columna invertida) queda encima de los botones; desde sm, a la izquierda. */}
          <MotivoDesactivado id="motivo-usuario" texto={motivoBloqueo} className="sm:order-first sm:mr-auto sm:max-w-xs" />
        </div>
      </form>
    </Modal>
  );
}
