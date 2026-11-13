"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorDeApi, type ErrorApi } from "./api";

interface Estado<T> {
  /** Función con la que se obtuvieron `datos` o `error`; si no es la actual, la consulta está cargando. */
  fuente: (() => Promise<T>) | null;
  datos: T | null;
  error: ErrorApi | null;
  /** Cuándo llegó la última respuesta. */
  en: Date | null;
}

/**
 * Estado de una consulta a la API para un gráfico o una tabla.
 *
 * - Carga al montar y cada vez que cambia `cargar` (memoízala con `useCallback` según sus filtros); mientras tanto
 *   `cargando` es `true` y no hay datos.
 * - `recargar()` vuelve a consultar sin borrar los datos visibles (`actualizando` es `true`): sirve para el
 *   refresco automático y el botón "Reintentar".
 * - Solo se aplica la respuesta de la última petición, así un filtro cambiado rápido no muestra datos viejos.
 *
 * @param cargar función que consulta la API
 */
export function useConsulta<T>(cargar: () => Promise<T>) {
  const [estado, setEstado] = useState<Estado<T>>({ fuente: null, datos: null, error: null, en: null });
  const [actualizando, setActualizando] = useState(false);
  const turno = useRef(0);

  const ejecutar = useCallback((fuente: () => Promise<T>) => {
    const propio = ++turno.current;
    fuente()
      .then((datos) => {
        if (propio === turno.current) setEstado({ fuente, datos, error: null, en: new Date() });
      })
      .catch((e: unknown) => {
        if (propio === turno.current) setEstado({ fuente, datos: null, error: errorDeApi(e), en: new Date() });
      })
      .finally(() => {
        if (propio === turno.current) setActualizando(false);
      });
  }, []);

  useEffect(() => {
    ejecutar(cargar);
  }, [cargar, ejecutar]);

  const recargar = useCallback(() => {
    setActualizando(true);
    ejecutar(cargar);
  }, [cargar, ejecutar]);

  const cargando = estado.fuente !== cargar;
  return {
    datos: cargando ? null : estado.datos,
    error: cargando ? null : estado.error,
    cargando,
    actualizando,
    actualizadoEn: estado.en,
    recargar,
  };
}
