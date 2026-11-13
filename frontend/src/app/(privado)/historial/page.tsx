"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_GERENCIA } from "@/lib/roles";
import HistorialIncidencias from "./HistorialIncidencias";
import PestanasHistorial from "./PestanasHistorial";

/** Historial de incidencias con filtros y exportación (RF-04 y RF-06): Administrador y Supervisor. */
export default function PaginaHistorial() {
  return (
    <RutaProtegida roles={ROLES_GERENCIA}>
      <PestanasHistorial />
      <HistorialIncidencias />
    </RutaProtegida>
  );
}
