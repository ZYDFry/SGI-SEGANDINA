"use client";

import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { useSesion } from "@/context/SesionContext";
import { opcionActiva, type OpcionMenu } from "@/lib/roles";
import IconoMenu from "./IconoMenu";
import { ID_PANEL_MENU } from "./MenuLateral";

interface Props {
  /** Opciones del menú del rol: dan el título de la pantalla actual. */
  opciones: OpcionMenu[];
  /** Si se recibe, muestra el botón "Menú" (pantallas chicas) que abre el panel del menú. */
  onAbrirMenu?: () => void;
  menuAbierto?: boolean;
  botonMenuRef?: RefObject<HTMLButtonElement | null>;
  /** El rol usa la barra inferior en el celular: el botón "Menú" solo aparece desde `sm`. */
  conBarraInferior?: boolean;
}

/**
 * Barra superior: título de la pantalla actual, usuario y rol, botón "Menú" en pantallas chicas y "Cerrar sesión"
 * (desde `sm`; en el celular está dentro de "Mi cuenta"). No aparece con contraseña temporal.
 */
export default function Encabezado({ opciones, onAbrirMenu, menuAbierto = false, botonMenuRef, conBarraInferior = false }: Props) {
  const { sesion, cerrarSesion } = useSesion();
  const ruta = usePathname();
  if (!sesion || sesion.usuario.debeCambiarContrasena) return null;

  const { usuario } = sesion;
  const activa = opcionActiva(ruta, opciones);
  const titulo = opciones.find((o) => o.href === activa)?.etiqueta ?? "SGI · Seguridad Andina";
  const visibilidadMenu = conBarraInferior ? "hidden sm:inline-flex lg:hidden" : "inline-flex lg:hidden";

  return (
    <header className="border-b border-blue-800 bg-blue-900 text-white shadow">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onAbrirMenu && (
            <button
              ref={botonMenuRef}
              type="button"
              onClick={onAbrirMenu}
              aria-expanded={menuAbierto}
              aria-controls={ID_PANEL_MENU}
              className={`${visibilidadMenu} shrink-0 items-center gap-2 rounded-lg border border-blue-300/40 px-3 py-2 text-sm font-semibold hover:bg-blue-800`}
            >
              <IconoMenu nombre="menu" />
              Menú
            </button>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-wide" data-testid="titulo-pantalla">
              {titulo}
            </p>
            <p className="truncate text-xs text-blue-200">
              {usuario.nombres} {usuario.apellidoPaterno} · {usuario.rol}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          className={`${onAbrirMenu || conBarraInferior ? "hidden sm:inline-flex" : "inline-flex"} shrink-0 items-center gap-2 rounded-lg border border-blue-300/40 px-3 py-2 text-sm font-semibold hover:bg-blue-800`}
        >
          <IconoMenu nombre="cerrar-sesion" />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
