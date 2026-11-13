"use client";

import { useEffect, useRef } from "react";

/** Intervalo del refresco automático del dashboard (60 s). */
export const REFRESCO_MS = 60_000;

/**
 * Llama a `refrescar` cada `intervaloMs` mientras la pestaña está visible. Con la pestaña oculta se pausa y, al
 * volver, refresca enseguida si ya pasó el intervalo. Siempre usa la última versión de `refrescar`.
 *
 * @param refrescar   función que recarga los datos
 * @param intervaloMs intervalo en milisegundos (por defecto 60 s)
 */
export function useRefresco(refrescar: () => void, intervaloMs: number = REFRESCO_MS) {
  const ultimo = useRef(refrescar);
  useEffect(() => {
    ultimo.current = refrescar;
  }, [refrescar]);

  useEffect(() => {
    let ultimaVez = Date.now();
    const ejecutar = () => {
      ultimaVez = Date.now();
      ultimo.current();
    };
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") ejecutar();
    }, intervaloMs);
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimaVez >= intervaloMs) ejecutar();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [intervaloMs]);
}
