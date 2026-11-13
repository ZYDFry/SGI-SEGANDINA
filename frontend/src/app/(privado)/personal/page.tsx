"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_ADMIN } from "@/lib/roles";
import GestionPersonal from "./GestionPersonal";

/** Gestión de personal (RF-02): solo Administrador. */
export default function PaginaPersonal() {
  return (
    <RutaProtegida roles={ROLES_ADMIN}>
      <GestionPersonal />
    </RutaProtegida>
  );
}
