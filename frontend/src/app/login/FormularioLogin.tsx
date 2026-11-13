"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import { useSesion } from "@/context/SesionContext";
import { errorDeApi } from "@/lib/api";
import { destinoInicial } from "@/lib/roles";
import { iniciarSesion } from "@/lib/servicios";
import { useValidacion } from "@/lib/useValidacion";
import {
  erroresDelServidor,
  LARGO_DNI,
  limpiarDni,
  sonDigitos,
  validarLogin,
  type CamposLogin as CamposLoginForm,
} from "@/lib/validaciones";

const ORDEN = ["dni", "contrasena"] as const;
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

      <div>
        <label htmlFor="dni" className="mb-1 block text-sm font-semibold text-slate-700">
          DNI
        </label>
        <input
          {...validacion.propsCampo("dni")}
          name="dni"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={campos.dni}
          onBeforeInput={bloquearNoDigitos}
          // Cubre lo pegado, el autocorrector y lo que no pase por beforeinput: solo dígitos, máximo 8.
          onChange={(e) => cambiar("dni", limpiarDni(e.target.value))}
          className={`${ESTILO_CAMPO} tracking-widest ${bordeCampo(!!errorDni)}`}
          placeholder="12345678"
        />
        <MensajeCampo campo="dni" mensaje={errorDni} />
      </div>

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
      <Boton
        type="submit"
        disabled={enviando || conSesion || validacion.hayErroresVisibles}
        className="w-full text-lg"
      >
        {enviando || conSesion ? "Ingresando…" : "Ingresar"}
      </Boton>
    </form>
  );
}

/**
 * Impide teclear en el DNI un carácter que no sea dígito o que pase del octavo, sin que salte el cursor. Lo que
 * llega de golpe (pegado, autocorrector) no se bloquea entero: `limpiarDni` en `onChange` conserva sus dígitos.
 */
function bloquearNoDigitos(evento: FormEvent<HTMLInputElement>) {
  const datos = (evento.nativeEvent as InputEvent).data;
  if (!datos || datos.length !== 1) return;
  const input = evento.currentTarget;
  const seleccionados = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
  if (!sonDigitos(datos) || input.value.length - seleccionados >= LARGO_DNI) {
    evento.preventDefault();
  }
}
