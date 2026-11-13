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
const VACIO: CamposCambioContrasena = {
  actual: "",
  nueva: "",
  confirmacion: "",
};

type Campo = keyof CamposCambioContrasena;

const ORDEN: readonly Campo[] = ["actual", "nueva", "confirmacion"];
const MAPA_SERVIDOR: Record<string, Campo> = {
  contrasenaActual: "actual",
  contrasenaNueva: "nueva",
};

/**
 * Cómo se usa el formulario:
 * - `obligatorio`: sesión con contraseña temporal (`/cambiar-contrasena`). Al guardar cierra la sesión y lleva al
 *   login, porque el token en uso sigue marcado.
 * - `voluntario`: cualquier usuario desde "Cambiar mi contraseña" (`/mi-contrasena`). Al guardar la sesión sigue
 *   abierta (el token no tiene marca) y se muestra la confirmación.
 */
export type ModoCambioContrasena = "obligatorio" | "voluntario";

/**
 * Formulario de cambio de la contraseña propia (`PATCH /api/usuarios/me/contrasena`) con contraseña actual, nueva
 * (8 a 72, distinta de la actual) y confirmación, con los avisos debajo de cada campo.
 */
export default function FormularioCambioContrasena({ modo = "obligatorio" }: { modo?: ModoCambioContrasena }) {
  const { cargando, sesion, cerrarSesion } = useSesion();
  const router = useRouter();
  const obligatorio = modo === "obligatorio";
  const marcada = !!sesion?.usuario.debeCambiarContrasena;

  const [campos, setCampos] = useState<CamposCambioContrasena>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const validacion = useValidacion(validarCambioContrasena(campos), ORDEN);

  // Solo en modo obligatorio: sin sesión va al login con su aviso; sin marca, no hay nada que cambiar. En modo
  // voluntario de eso se encarga RutaProtegida.
  useEffect(() => {
    if (!obligatorio || cargando) return;
    if (!sesion) {
      router.replace(rutaLogin(consumirMotivoCierre()));
    } else if (!sesion.usuario.debeCambiarContrasena) {
      router.replace(rutaInicio(sesion.usuario.rol));
    }
  }, [obligatorio, cargando, sesion, router]);

  // Reglas de negocio del backend (400 sin detalles) que se muestran bajo su campo.
  const reglas: ReglaServidor<Campo>[] = [
    {
      contiene: "actual no es correcta",
      campo: "actual",
      mensaje: obligatorio ? "La contraseña actual o temporal no es correcta" : "La contraseña actual no es correcta",
    },
    { contiene: "distinta de la actual", campo: "nueva" },
  ];

  function cambiar(campo: Campo, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    setExito(false);
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
      if (obligatorio) {
        // El token sigue marcado: se cierra la sesión y el efecto lleva al login con el aviso.
        borrarSesion("contrasena-cambiada");
      } else {
        setCampos(VACIO);
        validacion.reiniciar();
        setExito(true);
      }
    } catch (e) {
      const errorApi = errorDeApi(e);
      // Un 401 ya cerró la sesión (token vencido): RutaProtegida o el efecto redirigen al login.
      if (errorApi.status === 401) return;
      const { campos: porCampo, general } = erroresDelServidor(errorApi, MAPA_SERVIDOR, reglas);
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

  if (obligatorio && !marcada) return <Cargando />;
  if (!sesion) return <Cargando />;

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      {error && <Alerta tipo="error">{error}</Alerta>}
      {exito && <Alerta tipo="exito">Contraseña actualizada. Úsala la próxima vez que inicies sesión.</Alerta>}

      {campoContrasena(
        "actual",
        obligatorio ? "Contraseña actual o temporal" : "Contraseña actual",
        "current-password",
      )}
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
      {obligatorio ? (
        <Boton variante="secundario" onClick={cerrarSesion} disabled={enviando} className="w-full">
          Cerrar sesión
        </Boton>
      ) : (
        <Boton
          variante="secundario"
          onClick={() => router.push(rutaInicio(sesion.usuario.rol))}
          disabled={enviando}
          className="w-full"
        >
          {exito ? "Volver al inicio" : "Cancelar"}
        </Boton>
      )}
    </form>
  );
}
