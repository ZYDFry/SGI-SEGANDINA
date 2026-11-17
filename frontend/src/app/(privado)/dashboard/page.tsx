"use client";

import { Suspense } from "react";
import Cargando from "@/components/Cargando";
import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_GERENCIA } from "@/lib/roles";
import PanelDashboard from "./PanelDashboard";

/** Dashboard gerencial (RF-05 y RF-07): Administrador y Supervisor. */
export default function PaginaDashboard() {
  return (
    <RutaProtegida roles={ROLES_GERENCIA}>
      {/* Lee los filtros de la URL con useSearchParams: Next exige un Suspense alrededor. */}
      <Suspense fallback={<Cargando />}>
        <PanelDashboard />
      </Suspense>
    </RutaProtegida>
  );
}
