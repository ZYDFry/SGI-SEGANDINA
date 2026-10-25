import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_REGISTRO } from "@/lib/roles";
import FormularioIncidencia from "./FormularioIncidencia";

/** Registro de incidencias en campo (RF-03). Vigilante y Administrador. */
export default function PaginaNuevaIncidencia() {
  return (
    <RutaProtegida roles={ROLES_REGISTRO}>
      <FormularioIncidencia />
    </RutaProtegida>
  );
}
