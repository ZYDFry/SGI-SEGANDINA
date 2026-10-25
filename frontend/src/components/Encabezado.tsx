"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSesion } from "@/context/SesionContext";
import { menuDe } from "@/lib/roles";

/** Barra superior: usuario, menú según su rol y botón para cerrar sesión. */
export default function Encabezado() {
  const { sesion, cerrarSesion } = useSesion();
  const ruta = usePathname();
  if (!sesion) return null;

  const { usuario } = sesion;
  const opciones = menuDe(usuario.rol);

  return (
    <header className="bg-blue-900 text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-wide">SGI · Seguridad Andina</p>
          <p className="truncate text-xs text-blue-200">
            {usuario.nombres} {usuario.apellidoPaterno} · {usuario.rol}
          </p>
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          className="shrink-0 rounded-lg border border-blue-300/40 px-3 py-2 text-sm font-semibold hover:bg-blue-800"
        >
          Cerrar sesión
        </button>
      </div>
      {opciones.length > 1 && (
        <nav aria-label="Menú principal" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {opciones.map((opcion) => (
            <Link
              key={opcion.href}
              href={opcion.href}
              aria-current={ruta === opcion.href ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                ruta === opcion.href ? "bg-white text-blue-900 font-semibold" : "text-blue-100 hover:bg-blue-800"
              }`}
            >
              {opcion.etiqueta}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
