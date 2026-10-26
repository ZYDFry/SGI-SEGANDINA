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
 */
export default function FormularioLogin() {
  const { cargando, sesion } = useSesion();
  const router = useRouter();
  const motivo = useSearchParams().get("motivo");
  const sesionVencida = motivo === "expirada";
  const contrasenaActualizada = motivo === "contrasena-actualizada";

  const [dni, setDni] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Con sesión activa (recién iniciada o de antes) no tiene sentido quedarse en el login.
  useEffect(() => {
    if (!cargando && sesion) router.replace(destinoInicial(sesion.usuario));
  }, [cargando, sesion, router]);

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
      // La redirección la hace el efecto al detectar la sesión nueva.
    } catch (e) {
      const { status, mensaje } = errorDeApi(e);
      setError(status === 401 ? "DNI o contraseña incorrectos." : mensaje);
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

      <Boton type="submit" disabled={enviando} className="w-full text-lg">
        {enviando ? "Ingresando…" : "Ingresar"}
      </Boton>
    </form>
  );
}
