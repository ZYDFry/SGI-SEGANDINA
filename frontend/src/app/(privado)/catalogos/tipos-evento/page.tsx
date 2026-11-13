"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_ADMIN } from "@/lib/roles";
import PestanasCatalogos from "../PestanasCatalogos";
import GestionTiposEvento from "./GestionTiposEvento";

/** Catálogos, pestaña Tipos de evento (RF-09): solo Administrador. */
export default function PaginaTiposEvento() {
  return (
    <RutaProtegida roles={ROLES_ADMIN}>
      <PestanasCatalogos />
      <GestionTiposEvento />
    </RutaProtegida>
  );
}
