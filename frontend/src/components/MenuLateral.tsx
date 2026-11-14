"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";
import { useSesion } from "@/context/SesionContext";
import { gruposDe, opcionActiva, type OpcionMenu } from "@/lib/roles";
import IconoMenu from "./IconoMenu";

/** `id` del panel deslizable, para el `aria-controls` del botón "Menú". */
export const ID_PANEL_MENU = "menu-panel";

const ENFOCABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  opciones: OpcionMenu[];
  /** Panel deslizable abierto (solo pantallas chicas). */
  abierto: boolean;
  onCerrar: () => void;
  /** Botón "Menú" del encabezado: recibe de vuelta el foco al cerrar el panel. */
  botonMenuRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Menú de navegación según el rol, con íconos y grupos titulados ("Gestión", "Administración", "Mi cuenta"):
 * barra lateral fija en escritorio (`lg`) y panel deslizable en tablet y celular. El panel se abre con el botón
 * "Menú" del encabezado, lleva el foco al primer enlace, mantiene el Tab dentro y se cierra al elegir una opción,
 * con Escape, con ✕ o tocando fuera; al cerrarse el foco vuelve al botón. En el panel, "Mi cuenta" incluye
 * "Cerrar sesión".
 */
export default function MenuLateral({ opciones, abierto, onCerrar, botonMenuRef }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const estabaAbierto = useRef(false);

  useEffect(() => {
    if (abierto) {
      panelRef.current?.querySelector<HTMLElement>("nav a[href]")?.focus();
    } else if (estabaAbierto.current) {
      botonMenuRef.current?.focus();
    }
    estabaAbierto.current = abierto;
  }, [abierto, botonMenuRef]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCerrar();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const enfocables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(ENFOCABLES));
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, onCerrar]);

  return (
    <>
      <aside className="hidden w-60 shrink-0 bg-blue-900 lg:block" aria-label="Menú lateral">
        <p className="px-6 pt-4 text-sm font-bold tracking-wide text-white">SGI · Seguridad Andina</p>
        <Grupos opciones={opciones} onElegir={() => {}} />
      </aside>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú" id={ID_PANEL_MENU}>
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            onClick={onCerrar}
            className="absolute inset-0 bg-slate-900/50"
          />
          <aside ref={panelRef} className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-blue-900 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <span className="text-sm font-bold">SGI · Seguridad Andina</span>
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar menú"
                className="rounded-md p-2 text-blue-100 hover:bg-blue-800"
              >
                <IconoMenu nombre="cerrar" />
              </button>
            </div>
            <Grupos opciones={opciones} onElegir={onCerrar} conCerrarSesion />
          </aside>
        </div>
      )}
    </>
  );
}

function Grupos({
  opciones,
  onElegir,
  conCerrarSesion = false,
}: {
  opciones: OpcionMenu[];
  onElegir: () => void;
  conCerrarSesion?: boolean;
}) {
  const { cerrarSesion } = useSesion();
  const activa = opcionActiva(usePathname(), opciones);
  const grupos = gruposDe(opciones);
  const claseItem = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm";

  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-4 p-3">
      {grupos.map((grupo, i) => {
        const idTitulo = `grupo-${conCerrarSesion ? "panel" : "lateral"}-${i}`;
        const esCuenta = grupo.titulo === "Mi cuenta";
        return (
          <section
            key={grupo.titulo}
            aria-labelledby={idTitulo}
            className={`flex flex-col gap-1 ${esCuenta ? "border-t border-blue-800 pt-3" : ""}`}
          >
            <h2 id={idTitulo} className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
              {grupo.titulo}
            </h2>
            {grupo.opciones.map((opcion) => {
              const actual = opcion.href === activa;
              return (
                <Link
                  key={opcion.href}
                  href={opcion.href}
                  onClick={onElegir}
                  aria-current={actual ? "page" : undefined}
                  className={`${claseItem} ${actual ? "bg-white font-semibold text-blue-900" : "text-blue-100 hover:bg-blue-800"}`}
                >
                  <IconoMenu nombre={opcion.icono} />
                  {opcion.etiqueta}
                </Link>
              );
            })}
            {esCuenta && conCerrarSesion && (
              <button
                type="button"
                onClick={cerrarSesion}
                className={`${claseItem} text-left text-blue-100 hover:bg-blue-800`}
              >
                <IconoMenu nombre="cerrar-sesion" />
                Cerrar sesión
              </button>
            )}
          </section>
        );
      })}
    </nav>
  );
}
