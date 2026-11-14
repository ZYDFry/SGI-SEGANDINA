"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import CampoDni from "@/components/CampoDni";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import MotivoDesactivado, { textoMotivo } from "@/components/MotivoDesactivado";
import { useSesion } from "@/context/SesionContext";
import { errorDeApi } from "@/lib/api";
import { destinoInicial } from "@/lib/roles";
import { iniciarSesion } from "@/lib/servicios";
import { useValidacion } from "@/lib/useValidacion";
import { erroresDelServidor, validarLogin, type CamposLogin as CamposLoginForm } from "@/lib/validaciones";

const ORDEN = ["dni", "contrasena"] as const;
const ETIQUETAS: Record<keyof CamposLoginForm, string> = { dni: "DNI", contrasena: "Contraseña" };
const MAPA_SERVIDOR: Record<string, keyof CamposLoginForm> = { dni: "dni", contrasena: "contrasena" };
const ESTILO_CAMPO = "w-full rounded-lg border px-3 py-3 text-lg focus:outline-none focus:ring-2";

/**
 * Login por DNI y contraseña (RF-01). Tras entrar, redirige según el rol, o a cambiar la contraseña si la
 * que se usó es temporal.
 *
 * Next guarda las pantallas visitadas con su estado (y el navegador puede restaurarlas desde el bfcache al
 * pulsar Atrás), así que los campos se montan de nuevo cada vez que cambia la sesión o la página se restaura:
 * el formulario nunca reaparece con la contraseña escrita, errores viejos ni el botón en "Ingresando…".
 */
export default function FormularioLogin() {
  const { cargando, sesion } = useSesion();
  const router = useRouter();
  const [restauraciones, setRestauraciones] = useState(0);

  // Con sesión activa (recién iniciada o de antes) no tiene sentido quedarse en el login.
  useEffect(() => {
    if (!cargando && sesion) router.replace(destinoInicial(sesion.usuario));
  }, [cargando, sesion, router]);

  // Página restaurada desde el bfcache (botón Atrás): se descarta el estado que tenía.
  useEffect(() => {
    function alMostrar(evento: PageTransitionEvent) {
      if (evento.persisted) setRestauraciones((n) => n + 1);
    }
    window.addEventListener("pageshow", alMostrar);
    return () => window.removeEventListener("pageshow", alMostrar);
  }, []);

  return <CamposLogin key={`${sesion?.token ?? "sin-sesion"}-${restauraciones}`} conSesion={!!sesion} />;
}

function CamposLogin({ conSesion }: { conSesion: boolean }) {
  const motivo = useSearchParams().get("motivo");
  const sesionVencida = motivo === "expirada";
  const contrasenaActualizada = motivo === "contrasena-actualizada";

  const [campos, setCampos] = useState<CamposLoginForm>({ dni: "", contrasena: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const validacion = useValidacion(validarLogin(campos), ORDEN);

  function cambiar(campo: keyof CamposLoginForm, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    validacion.alCambiar(campo);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !validacion.intentarEnviar()) return;
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(campos.dni.trim(), campos.contrasena);
      // La redirección la hace FormularioLogin al detectar la sesión nueva.
    } catch (e) {
      const errorApi = errorDeApi(e);
      if (errorApi.status === 401) {
        setError("DNI o contraseña incorrectos.");
      } else {
        const { campos: porCampo, general } = erroresDelServidor(errorApi, MAPA_SERVIDOR);
        validacion.ponerErroresServidor(porCampo);
        setError(general);
      }
    } finally {
      setEnviando(false);
    }
  }

  const errorDni = validacion.error("dni");
  const errorContrasena = validacion.error("contrasena");
  // Por qué "Ingresar" está desactivado (solo por avisos, no mientras se envía).
  const motivoBloqueo = enviando || conSesion ? undefined : textoMotivo(validacion.primerErrorVisible(), ETIQUETAS);

  return (
    // Equipos compartidos entre vigilantes: el navegador no debe rellenar ni restaurar las credenciales.
    <form onSubmit={enviar} noValidate autoComplete="off" className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      {sesionVencida && !error && (
        <Alerta tipo="aviso">Tu sesión venció. Vuelve a iniciar sesión.</Alerta>
      )}
      {contrasenaActualizada && !error && (
        <Alerta tipo="exito">Contraseña actualizada, inicia sesión con la nueva.</Alerta>
      )}
      {error && <Alerta tipo="error">{error}</Alerta>}

      <CampoDni
        props={validacion.propsCampo("dni")}
        valor={campos.dni}
        onCambio={(dni) => cambiar("dni", dni)}
        error={errorDni}
        placeholder="12345678"
        className="px-3 py-3 text-lg"
      />

      <div>
        <label htmlFor="contrasena" className="mb-1 block text-sm font-semibold text-slate-700">
          Contraseña
        </label>
        <input
          {...validacion.propsCampo("contrasena")}
          name="contrasena"
          type="password"
          // Chrome y Edge ignoran "off" en contraseñas; "new-password" sí evita que la rellenen solos.
          autoComplete="new-password"
          value={campos.contrasena}
          onChange={(e) => cambiar("contrasena", e.target.value)}
          className={`${ESTILO_CAMPO} ${bordeCampo(!!errorContrasena)}`}
        />
        <MensajeCampo campo="contrasena" mensaje={errorContrasena} />
      </div>

      {/* Con sesión ya iniciada se espera la redirección: el botón no vuelve a "Ingresar" */}
      <div className="space-y-2">
        <Boton
          type="submit"
          disabled={enviando || conSesion || validacion.hayErroresVisibles}
          title={motivoBloqueo}
          aria-describedby={motivoBloqueo ? "motivo-login" : undefined}
          className="w-full text-lg"
        >
          {enviando || conSesion ? "Ingresando…" : "Ingresar"}
        </Boton>
        <MotivoDesactivado id="motivo-login" texto={motivoBloqueo} className="text-center" />
      </div>
    </form>
  );
}

