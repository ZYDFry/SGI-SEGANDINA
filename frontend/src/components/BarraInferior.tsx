"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/context/SesionContext";
import { opcionActiva, type OpcionMenu } from "@/lib/roles";
import IconoMenu from "./IconoMenu";

const ID_HOJA_CUENTA = "hoja-mi-cuenta";

/**
 * Barra de navegación fija al pie, solo en el celular (`< sm`), para el Vigilante: un ítem con ícono y texto por
 * cada opción de trabajo ("Registrar" y "Mis incidencias") y "Mi cuenta", que abre una hoja con las
 * opciones de la cuenta y "Cerrar sesión". La opción de la pantalla actual se marca con `aria-current="page"`.
 * Su alto lo publica `MarcoPrivado` en `--alto-barra-inferior` para que los elementos fijos queden por encima.
 */
export default function BarraInferior({ opciones }: { opciones: OpcionMenu[] }) {
  const { cerrarSesion } = useSesion();
  const ruta = usePathname();
  const activa = opcionActiva(ruta, opciones);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const botonCuentaRef = useRef<HTMLButtonElement>(null);
  const hojaRef = useRef<HTMLDivElement>(null);
  const estabaAbierta = useRef(false);

  const trabajo = opciones.filter((o) => o.grupo !== "Mi cuenta");
  const cuenta = opciones.filter((o) => o.grupo === "Mi cuenta");
  const cuentaActiva = cuenta.some((o) => o.href === activa);

  useEffect(() => {
    if (hojaAbierta) {
      hojaRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    } else if (estabaAbierta.current) {
      botonCuentaRef.current?.focus();
    }
    estabaAbierta.current = hojaAbierta;
  }, [hojaAbierta]);

  useEffect(() => {
    if (!hojaAbierta) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHojaAbierta(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [hojaAbierta]);

  const claseItem = (actual: boolean) =>
    `flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
      actual ? "text-blue-900" : "text-slate-500 hover:text-blue-800"
    }`;
  const marca = (actual: boolean) => (
    <span className={`h-1 w-10 rounded-full ${actual ? "bg-blue-900" : "bg-transparent"}`} aria-hidden="true" />
  );

  return (
    <>
      {hojaAbierta && (
        <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true" aria-label="Mi cuenta" id={ID_HOJA_CUENTA}>
          <button
            type="button"
            aria-label="Cerrar Mi cuenta"
            tabIndex={-1}
            onClick={() => setHojaAbierta(false)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <div
            ref={hojaRef}
            className="absolute inset-x-0 bottom-[var(--alto-barra-inferior,0px)] rounded-t-2xl bg-white p-3 shadow-2xl"
          >
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Mi cuenta</p>
            {cuenta.map((opcion) => (
              <Link
                key={opcion.href}
                href={opcion.href}
                onClick={() => setHojaAbierta(false)}
                aria-current={opcion.href === activa ? "page" : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base text-slate-800 hover:bg-slate-100"
              >
                <IconoMenu nombre={opcion.icono} />
                {opcion.etiqueta}
              </Link>
            ))}
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base text-red-700 hover:bg-red-50"
            >
              <IconoMenu nombre="cerrar-sesion" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(15,23,42,0.08)] sm:hidden"
      >
        <div className="flex h-16 items-stretch">
          {trabajo.map((opcion) => {
            const actual = opcion.href === activa;
            return (
              <Link
                key={opcion.href}
                href={opcion.href}
                aria-current={actual ? "page" : undefined}
                className={claseItem(actual)}
              >
                {marca(actual)}
                <IconoMenu nombre={opcion.icono} className="h-6 w-6" />
                {opcion.etiquetaCorta ?? opcion.etiqueta}
              </Link>
            );
          })}
          <button
            ref={botonCuentaRef}
            type="button"
            onClick={() => setHojaAbierta((a) => !a)}
            aria-expanded={hojaAbierta}
            aria-controls={ID_HOJA_CUENTA}
            aria-current={cuentaActiva ? "page" : undefined}
            className={claseItem(cuentaActiva || hojaAbierta)}
          >
            {marca(cuentaActiva)}
            <IconoMenu nombre="cuenta" className="h-6 w-6" />
            Mi cuenta
          </button>
        </div>
      </nav>
    </>
  );
}
