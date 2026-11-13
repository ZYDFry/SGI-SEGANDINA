"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_ADMIN } from "@/lib/roles";
import GestionZonas from "./GestionZonas";
import PestanasCatalogos from "./PestanasCatalogos";

/** Catálogos, pestaña Zonas (RF-09): solo Administrador. */
export default function PaginaCatalogos() {
  return (
    <RutaProtegida roles={ROLES_ADMIN}>
      <PestanasCatalogos />
      <GestionZonas />
    </RutaProtegida>
  );
}
