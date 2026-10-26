"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { borrarSesion, leerSesionCruda, parsearSesion, suscribirSesion, type Sesion } from "@/lib/sesion";

interface ValorSesion {
  /** true mientras no se ha leído localStorage (render del servidor e hidratación). */
  cargando: boolean;
  sesion: Sesion | null;
  cerrarSesion: () => void;
}

const SesionContext = createContext<ValorSesion | null>(null);

// En el servidor no hay localStorage: undefined indica "todavía no se sabe".
const snapshotServidor = () => undefined;

/** Expone la sesión a toda la app y la cierra automáticamente cuando el token vence. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const cruda = useSyncExternalStore(suscribirSesion, leerSesionCruda, snapshotServidor);
  const sesion = useMemo(() => (cruda === undefined ? null : parsearSesion(cruda)), [cruda]);

  // Programa el cierre al llegar a expiraEn (si ya venció, se cierra de inmediato).
  useEffect(() => {
    if (!sesion) return;
    const restante = Date.parse(sesion.expiraEn) - Date.now();
    const temporizador = setTimeout(() => borrarSesion("expirada"), Math.max(restante, 0));
    return () => clearTimeout(temporizador);
  }, [sesion]);

  const valor = useMemo<ValorSesion>(
    () => ({
      cargando: cruda === undefined,
      sesion,
      // replace evita volver con Atrás a la pantalla privada; refresh descarta las páginas guardadas en caché.
      cerrarSesion: () => {
        borrarSesion("manual");
        router.replace("/login");
        router.refresh();
      },
    }),
    [cruda, sesion, router],
  );

  return <SesionContext value={valor}>{children}</SesionContext>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error("useSesion debe usarse dentro de SesionProvider");
  return valor;
}
