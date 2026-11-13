"use client";

import { useSesion } from "@/context/SesionContext";

interface Props {
  /** Si se recibe, muestra el botón "Menú" (pantallas chicas) que abre el menú lateral. */
  onAbrirMenu?: () => void;
}

/** Barra superior: usuario, rol y botón para cerrar sesión. No aparece con contraseña temporal. */
export default function Encabezado({ onAbrirMenu }: Props) {
  const { sesion, cerrarSesion } = useSesion();
  if (!sesion || sesion.usuario.debeCambiarContrasena) return null;

  const { usuario } = sesion;

  return (
    <header className="border-b border-blue-800 bg-blue-900 text-white shadow">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onAbrirMenu && (
            <button
              type="button"
              onClick={onAbrirMenu}
              className="shrink-0 rounded-lg border border-blue-300/40 px-3 py-2 text-sm font-semibold hover:bg-blue-800 lg:hidden"
            >
              ☰ Menú
            </button>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide">SGI · Seguridad Andina</p>
            <p className="truncate text-xs text-blue-200">
              {usuario.nombres} {usuario.apellidoPaterno} · {usuario.rol}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          className="shrink-0 rounded-lg border border-blue-300/40 px-3 py-2 text-sm font-semibold hover:bg-blue-800"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
