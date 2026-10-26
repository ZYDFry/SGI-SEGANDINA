"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import { useSesion } from "@/context/SesionContext";
import { errorDeApi } from "@/lib/api";
import { destinoInicial } from "@/lib/roles";
import { iniciarSesion } from "@/lib/servicios";

const DNI_VALIDO = /^\d{8}$/;

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

  const [dni, setDni] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!DNI_VALIDO.test(dni)) {
      setError("El DNI debe tener 8 dígitos.");
      return;
    }
    if (!contrasena) {
      setError("Ingresa tu contraseña.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(dni, contrasena);
      // La redirección la hace FormularioLogin al detectar la sesión nueva.
    } catch (e) {
      const { status, mensaje } = errorDeApi(e);
      setError(status === 401 ? "DNI o contraseña incorrectos." : mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
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
          id="dni"
          name="dni"
          inputMode="numeric"
          autoComplete="username"
          maxLength={8}
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-lg tracking-widest focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          placeholder="12345678"
        />
      </div>

      <div>
        <label htmlFor="contrasena" className="mb-1 block text-sm font-semibold text-slate-700">
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-lg focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
        />
      </div>

      {/* Con sesión ya iniciada se espera la redirección: el botón no vuelve a "Ingresar" */}
      <Boton type="submit" disabled={enviando || conSesion} className="w-full text-lg">
        {enviando || conSesion ? "Ingresando…" : "Ingresar"}
      </Boton>
    </form>
  );
}
