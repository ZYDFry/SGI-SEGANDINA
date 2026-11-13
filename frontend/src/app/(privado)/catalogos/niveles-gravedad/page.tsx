"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_ADMIN } from "@/lib/roles";
import PestanasCatalogos from "../PestanasCatalogos";
import GestionNiveles from "./GestionNiveles";

/** Catálogos, pestaña Niveles de gravedad (RF-09): solo Administrador. */
export default function PaginaNivelesGravedad() {
  return (
    <RutaProtegida roles={ROLES_ADMIN}>
      <PestanasCatalogos />
      <GestionNiveles />
    </RutaProtegida>
  );
}
