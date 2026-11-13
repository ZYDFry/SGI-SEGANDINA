"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_ADMIN } from "@/lib/roles";
import PestanasHistorial from "../PestanasHistorial";
import ConsultaAuditoria from "./ConsultaAuditoria";

/** Consulta de auditoría (RF-08): solo Administrador. */
export default function PaginaAuditoria() {
  return (
    <RutaProtegida roles={ROLES_ADMIN}>
      <PestanasHistorial />
      <ConsultaAuditoria />
    </RutaProtegida>
  );
}
