"use client";

import { Suspense, useCallback, useRef, useState, type ReactNode } from "react";
import { useSesion } from "@/context/SesionContext";
import { menuDe } from "@/lib/roles";
import BarraInferior from "./BarraInferior";
import Encabezado from "./Encabezado";
import MenuLateral from "./MenuLateral";

/**
 * Marco de las pantallas con sesión: encabezado con el título de la pantalla y, si el rol tiene más de una
 * pantalla, el menú: barra lateral en escritorio y panel deslizable con "Menú" en tablet y celular. El Vigilante,
 * en el celular (`< sm`), navega con la barra inferior en lugar del panel.
 *
 * Publica el alto de la barra inferior en la variable CSS `--alto-barra-inferior` (0 si no hay barra o desde `sm`)
 * para que los elementos fijos al pie, como el botón "Registrar incidencia", queden por encima de ella.
 *
 * El encabezado, el menú y la barra inferior leen la ruta con `usePathname`; van dentro de `Suspense` para que las
 * rutas con un parámetro que solo se conoce al pedirlas (p. ej. `/despliegue/[idZona]`) se puedan compilar. Sin
 * sesión no muestran nada, así que su `fallback` vacío no cambia lo que se ve.
 */
export default function MarcoPrivado({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
  const botonMenuRef = useRef<HTMLButtonElement>(null);

  const opciones = sesion && !sesion.usuario.debeCambiarContrasena ? menuDe(sesion.usuario.rol) : [];
  const conMenu = opciones.length > 1;
  const conBarraInferior = conMenu && sesion?.usuario.rol === "Vigilante";

  return (
    <div
      className={`flex w-full flex-1 flex-col ${
        conBarraInferior ? "[--alto-barra-inferior:4rem] sm:[--alto-barra-inferior:0px]" : "[--alto-barra-inferior:0px]"
      }`}
    >
      <Suspense fallback={null}>
        <Encabezado
          opciones={opciones}
          onAbrirMenu={conMenu ? () => setMenuAbierto(true) : undefined}
          menuAbierto={menuAbierto}
          botonMenuRef={botonMenuRef}
          conBarraInferior={conBarraInferior}
        />
      </Suspense>
      <div className="flex w-full flex-1">
        {conMenu && (
          <Suspense fallback={null}>
            <MenuLateral opciones={opciones} abierto={menuAbierto} onCerrar={cerrarMenu} botonMenuRef={botonMenuRef} />
          </Suspense>
        )}
        <main
          className={`mx-auto w-full min-w-0 flex-1 px-4 py-5 ${conMenu ? "max-w-7xl lg:px-6" : "max-w-6xl"} ${
            conBarraInferior ? "pb-[calc(var(--alto-barra-inferior)+1.25rem)]" : ""
          }`}
        >
          {children}
        </main>
      </div>
      {conBarraInferior && (
        <Suspense fallback={null}>
          <BarraInferior opciones={opciones} />
        </Suspense>
      )}
    </div>
  );
}
