"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useSesion } from "@/context/SesionContext";
import { menuDe } from "@/lib/roles";
import Encabezado from "./Encabezado";
import MenuLateral from "./MenuLateral";

/**
 * Marco de las pantallas con sesión: encabezado y, si el rol tiene más de una pantalla, menú lateral (fijo en
 * escritorio, deslizable con "☰ Menú" en tablet y celular). Todos los roles lo tienen: el Vigilante, con el
 * registro de incidencias y "Cambiar mi contraseña".
 */
export default function MarcoPrivado({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  const opciones = sesion && !sesion.usuario.debeCambiarContrasena ? menuDe(sesion.usuario.rol) : [];
  const conMenu = opciones.length > 1;

  return (
    <>
      <Encabezado onAbrirMenu={conMenu ? () => setMenuAbierto(true) : undefined} />
      <div className="flex w-full flex-1">
        {conMenu && <MenuLateral opciones={opciones} abierto={menuAbierto} onCerrar={cerrarMenu} />}
        <main className={`mx-auto w-full min-w-0 flex-1 px-4 py-5 ${conMenu ? "max-w-7xl lg:px-6" : "max-w-6xl"}`}>
          {children}
        </main>
      </div>
    </>
  );
}
