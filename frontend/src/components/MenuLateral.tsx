"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { opcionActiva, type OpcionMenu } from "@/lib/roles";

interface Props {
  opciones: OpcionMenu[];
  /** Panel deslizable abierto (solo pantallas chicas). */
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Menú de navegación según el rol: barra lateral fija en escritorio (`lg`) y panel deslizable en tablet y móvil,
 * que se abre con el botón "Menú" del encabezado y se cierra al elegir una opción, con Escape o tocando fuera.
 */
export default function MenuLateral({ opciones, abierto, onCerrar }: Props) {
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, onCerrar]);

  return (
    <>
      <aside className="hidden w-56 shrink-0 bg-blue-900 lg:block" aria-label="Menú lateral">
        <Opciones opciones={opciones} onElegir={() => {}} />
      </aside>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" onClick={onCerrar} className="absolute inset-0 bg-slate-900/50" />
          <aside className="absolute inset-y-0 left-0 w-64 bg-blue-900 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <span className="text-sm font-bold">SGI · Seguridad Andina</span>
              <button type="button" onClick={onCerrar} className="rounded-md px-2 py-1 text-blue-100 hover:bg-blue-800">
                ✕
              </button>
            </div>
            <Opciones opciones={opciones} onElegir={onCerrar} />
          </aside>
        </div>
      )}
    </>
  );
}

function Opciones({ opciones, onElegir }: { opciones: OpcionMenu[]; onElegir: () => void }) {
  const activa = opcionActiva(usePathname(), opciones);
  const enlace = (opcion: OpcionMenu) => {
    const actual = opcion.href === activa;
    return (
      <Link
        key={opcion.href}
        href={opcion.href}
        onClick={onElegir}
        aria-current={actual ? "page" : undefined}
        className={`rounded-lg px-3 py-2 text-sm ${
          actual ? "bg-white font-semibold text-blue-900" : "text-blue-100 hover:bg-blue-800"
        }`}
      >
        {opcion.etiqueta}
      </Link>
    );
  };
  const trabajo = opciones.filter((o) => !o.cuenta);
  const cuenta = opciones.filter((o) => o.cuenta);
  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-1 p-3">
      {trabajo.map(enlace)}
      {cuenta.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t border-blue-800 pt-3">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-blue-300">Mi cuenta</p>
          {cuenta.map(enlace)}
        </div>
      )}
    </nav>
  );
}
