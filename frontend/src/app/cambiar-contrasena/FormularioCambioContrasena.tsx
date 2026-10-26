"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alerta from "@/components/Alerta";
import Boton from "@/components/Boton";
import Cargando from "@/components/Cargando";
import { useSesion } from "@/context/SesionContext";
import { errorDeApi } from "@/lib/api";
import { rutaInicio, rutaLogin } from "@/lib/roles";
import { cambiarContrasenaPropia } from "@/lib/servicios";
import { borrarSesion, consumirMotivoCierre } from "@/lib/sesion";

const LARGO_MINIMO = 8;
const LARGO_MAXIMO = 16;

const ESTILO_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-3 text-lg focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20";

interface Campos {
  actual: string;
  nueva: string;
  confirmacion: string;
}

/** Devuelve el primer problema de los datos ingresados, o null si se pueden enviar. */
function validar({ actual, nueva, confirmacion }: Campos): string | null {
  if (!actual) return "Ingresa tu contraseña actual o temporal.";
  if (!nueva) return "Ingresa la nueva contraseña.";
  if (nueva.length < LARGO_MINIMO || nueva.length > LARGO_MAXIMO) {
    return `La nueva contraseña debe tener entre ${LARGO_MINIMO} y ${LARGO_MAXIMO} caracteres.`;
  }
  if (nueva === actual) return "La nueva contraseña debe ser distinta de la actual.";
  if (nueva !== confirmacion) return "La confirmación no coincide con la nueva contraseña.";
  return null;
}

/**
 * Cambio de la contraseña temporal. Solo se muestra con una sesión marcada; al guardar, cierra la sesión y
 * lleva al login para entrar con la contraseña nueva.
 */
export default function FormularioCambioContrasena() {
  const { cargando, sesion, cerrarSesion } = useSesion();
  const router = useRouter();
  const marcada = !!sesion?.usuario.debeCambiarContrasena;

  const [campos, setCampos] = useState<Campos>({ actual: "", nueva: "", confirmacion: "" });
  const [error, setError] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Sin sesión (cerrada, vencida o tras el cambio) va al login con su aviso; sin marca, no hay nada que cambiar.
  useEffect(() => {
    if (cargando) return;
    if (!sesion) {
      router.replace(rutaLogin(consumirMotivoCierre()));
    } else if (!sesion.usuario.debeCambiarContrasena) {
      router.replace(rutaInicio(sesion.usuario.rol));
    }
  }, [cargando, sesion, router]);

  function cambiar(campo: keyof Campos, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problema = validar(campos);
    setError(problema);
    setDetalles([]);
    if (problema) return;

    setEnviando(true);
    try {
      await cambiarContrasenaPropia(campos.actual, campos.nueva);
      // El token sigue marcado: se cierra la sesión y el efecto lleva al login con el aviso.
      borrarSesion("contrasena-cambiada");
    } catch (e) {
      const { status, mensaje, detalles } = errorDeApi(e);
      // Un 401 ya cerró la sesión (token vencido): el efecto redirige al login.
      if (status === 401) return;
      setError(mensaje === "La contraseña actual no es correcta" ? "La contraseña actual o temporal no es correcta." : mensaje);
      setDetalles(detalles);
    } finally {
      setEnviando(false);
    }
  }

  if (!marcada) return <Cargando />;

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      {error && (
        <Alerta tipo="error">
          {error}
          {detalles.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {detalles.map((detalle) => (
                <li key={detalle}>{detalle}</li>
              ))}
            </ul>
          )}
        </Alerta>
      )}

      <div>
        <label htmlFor="actual" className="mb-1 block text-sm font-semibold text-slate-700">
          Contraseña actual o temporal
        </label>
        <input
          id="actual"
          name="actual"
          type="password"
          autoComplete="current-password"
          value={campos.actual}
          onChange={(e) => cambiar("actual", e.target.value)}
          className={ESTILO_CAMPO}
        />
      </div>

      <div>
        <label htmlFor="nueva" className="mb-1 block text-sm font-semibold text-slate-700">
          Nueva contraseña
        </label>
        <input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          aria-describedby="ayuda-nueva"
          value={campos.nueva}
          onChange={(e) => cambiar("nueva", e.target.value)}
          className={ESTILO_CAMPO}
        />
        <p id="ayuda-nueva" className="mt-1 text-xs text-slate-500">
          Entre {LARGO_MINIMO} y {LARGO_MAXIMO} caracteres, distinta de la actual.
        </p>
      </div>

      <div>
        <label htmlFor="confirmacion" className="mb-1 block text-sm font-semibold text-slate-700">
          Confirma la nueva contraseña
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          value={campos.confirmacion}
          onChange={(e) => cambiar("confirmacion", e.target.value)}
          className={ESTILO_CAMPO}
        />
      </div>

      <Boton type="submit" disabled={enviando} className="w-full text-lg">
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </Boton>
      <Boton variante="secundario" onClick={cerrarSesion} disabled={enviando} className="w-full">
        Cerrar sesión
      </Boton>
    </form>
  );
}
