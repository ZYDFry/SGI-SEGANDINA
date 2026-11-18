"use client";

import { useEffect, useState } from "react";

/**
 * Segundos que faltan hasta una fecha ISO, actualizados cada segundo; `0` si no hay fecha o ya pasó. Se usa para el
 * plazo de corrección de "Mis incidencias" (`editableHasta`).
 */
export function useCuentaRegresiva(hasta: string | null): number {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!hasta) return;
    const limite = Date.parse(hasta);
    const intervalo = window.setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= limite) window.clearInterval(intervalo);
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [hasta]);

  if (!hasta) return 0;
  return Math.max(0, Math.ceil((Date.parse(hasta) - ahora) / 1000));
}
