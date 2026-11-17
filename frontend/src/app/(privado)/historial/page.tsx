"use client";

import { Suspense } from "react";
import Cargando from "@/components/Cargando";
import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_GERENCIA } from "@/lib/roles";
import HistorialIncidencias from "./HistorialIncidencias";
import PestanasHistorial from "./PestanasHistorial";

/** Historial de incidencias con filtros y exportación (RF-04 y RF-06): Administrador y Supervisor. */
export default function PaginaHistorial() {
  return (
    <RutaProtegida roles={ROLES_GERENCIA}>
      <PestanasHistorial />
      {/* Lee los filtros de la URL con useSearchParams: Next exige un Suspense alrededor. */}
      <Suspense fallback={<Cargando />}>
        <HistorialIncidencias />
      </Suspense>
    </RutaProtegida>
  );
}
