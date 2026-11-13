"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_GERENCIA } from "@/lib/roles";
import PanelDashboard from "./PanelDashboard";

/** Dashboard gerencial (RF-05 y RF-07): Administrador y Supervisor. */
export default function PaginaDashboard() {
  return (
    <RutaProtegida roles={ROLES_GERENCIA}>
      <PanelDashboard />
    </RutaProtegida>
  );
}
