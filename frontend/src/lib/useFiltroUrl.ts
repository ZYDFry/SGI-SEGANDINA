"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { consultaDesdeFiltro, filtroDesdeUrl } from "./filtrosUrl";
import type { FiltroIncidencias } from "./tipos";

/**
 * Filtros comunes guardados en la URL (`?periodo=&desde=&hasta=&idZona=&idTipoEvento=&idNivelGravedad=`). La URL
 * es la única fuente de verdad: un enlace copiado reproduce los filtros y "Atrás" deshace el último cambio.
 * Usa `useSearchParams`, así que el componente que lo llama debe estar dentro de `<Suspense>`.
 *
 * @return `filtro` vigente, su `consulta` (query string sin "?") y `aplicar`, que agrega una entrada al historial
 *         del navegador con los filtros nuevos (sin desplazar la página)
 */
export function useFiltroUrl() {
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const texto = params.toString();

  // Se memoiza por el texto de la URL para que las consultas no se repitan en cada render.
  const filtro = useMemo(() => filtroDesdeUrl(new URLSearchParams(texto)), [texto]);
  const consulta = useMemo(() => consultaDesdeFiltro(filtro), [filtro]);

  const aplicar = useCallback(
    (nuevo: FiltroIncidencias) => {
      const siguiente = consultaDesdeFiltro(nuevo);
      if (siguiente === consulta) return;
      router.push(siguiente ? `${ruta}?${siguiente}` : ruta, { scroll: false });
    },
    [consulta, router, ruta],
  );

  return { filtro, consulta, aplicar };
}
