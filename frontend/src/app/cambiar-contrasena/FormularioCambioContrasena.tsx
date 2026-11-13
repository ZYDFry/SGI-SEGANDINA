"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import Cargando from "@/components/Cargando";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import { useSesion } from "@/context/SesionContext";
import { errorDeApi } from "@/lib/api";
import { rutaInicio, rutaLogin } from "@/lib/roles";
import { cambiarContrasenaPropia } from "@/lib/servicios";
import { borrarSesion, consumirMotivoCierre } from "@/lib/sesion";
import { useValidacion } from "@/lib/useValidacion";
import {
  CONTRASENA_MAX,
  CONTRASENA_MIN,
  erroresDelServidor,
  validarCambioContrasena,
  type CamposCambioContrasena,
  type ReglaServidor,
} from "@/lib/validaciones";

const ESTILO_CAMPO = "w-full rounded-lg border px-3 py-3 text-lg focus:outline-none focus:ring-2";

type Campo = keyof CamposCambioContrasena;

const ORDEN: readonly Campo[] = ["actual", "nueva", "confirmacion"];
const MAPA_SERVIDOR: Record<string, Campo> = { contrasenaActual: "actual", contrasenaNueva: "nueva" };
// Reglas de negocio del backend (400 sin detalles) que se muestran bajo su campo.
const REGLAS_SERVIDOR: ReglaServidor<Campo>[] = [
  { contiene: "actual no es correcta", campo: "actual", mensaje: "La contraseña actual o temporal no es correcta" },
  { contiene: "distinta de la actual", campo: "nueva" },
];

/**
 * Cambio de la contraseña temporal. Solo se muestra con una sesión marcada; al guardar, cierra la sesión y
 * lleva al login para entrar con la contraseña nueva.
 */
export default function FormularioCambioContrasena() {
  const { cargando, sesion, cerrarSesion } = useSesion();
  const router = useRouter();
  const marcada = !!sesion?.usuario.debeCambiarContrasena;

  const [campos, setCampos] = useState<CamposCambioContrasena>({ actual: "", nueva: "", confirmacion: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const validacion = useValidacion(validarCambioContrasena(campos), ORDEN);

  // Sin sesión (cerrada, vencida o tras el cambio) va al login con su aviso; sin marca, no hay nada que cambiar.
  useEffect(() => {
    if (cargando) return;
    if (!sesion) {
      router.replace(rutaLogin(consumirMotivoCierre()));
    } else if (!sesion.usuario.debeCambiarContrasena) {
      router.replace(rutaInicio(sesion.usuario.rol));
    }
  }, [cargando, sesion, router]);

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
      // Las contraseñas no se recortan: un espacio al inicio o al final es parte de la contraseña.
      await cambiarContrasenaPropia(campos.actual, campos.nueva);
      // El token sigue marcado: se cierra la sesión y el efecto lleva al login con el aviso.
      borrarSesion("contrasena-cambiada");
    } catch (e) {
      const errorApi = errorDeApi(e);
      // Un 401 ya cerró la sesión (token vencido): el efecto redirige al login.
      if (errorApi.status === 401) return;
      const { campos: porCampo, general } = erroresDelServidor(errorApi, MAPA_SERVIDOR, REGLAS_SERVIDOR);
      validacion.ponerErroresServidor(porCampo);
      setError(general);
    } finally {
      setEnviando(false);
    }
  }

  /** Input de contraseña con su etiqueta, borde según el aviso y el aviso debajo. */
  function campoContrasena(campo: Campo, etiqueta: string, autoComplete: string, ayuda?: string) {
    const mensaje = validacion.error(campo);
    const props = validacion.propsCampo(campo);
    const idAyuda = ayuda ? `ayuda-${campo}` : undefined;
    return (
      <div>
        <label htmlFor={campo} className="mb-1 block text-sm font-semibold text-slate-700">
          {etiqueta}
        </label>
        <input
          {...props}
          aria-describedby={[props["aria-describedby"], idAyuda].filter(Boolean).join(" ") || undefined}
          name={campo}
          type="password"
          autoComplete={autoComplete}
          value={campos[campo]}
          onChange={(e) => cambiar(campo, e.target.value)}
          className={`${ESTILO_CAMPO} ${bordeCampo(!!mensaje)}`}
        />
        <MensajeCampo campo={campo} mensaje={mensaje} />
        {ayuda && (
          <p id={idAyuda} className="mt-1 text-xs text-slate-500">
            {ayuda}
          </p>
        )}
      </div>
    );
  }

  if (!marcada) return <Cargando />;

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      {error && <Alerta tipo="error">{error}</Alerta>}

      {campoContrasena("actual", "Contraseña actual o temporal", "current-password")}
      {campoContrasena(
        "nueva",
        "Nueva contraseña",
        "new-password",
        `Entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres, distinta de la actual.`,
      )}
      {campoContrasena("confirmacion", "Confirma la nueva contraseña", "new-password")}

      <Boton type="submit" disabled={enviando || validacion.hayErroresVisibles} className="w-full text-lg">
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </Boton>
      <Boton variante="secundario" onClick={cerrarSesion} disabled={enviando} className="w-full">
        Cerrar sesión
      </Boton>
    </form>
  );
}
