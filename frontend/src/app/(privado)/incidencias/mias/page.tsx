import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_REGISTRO } from "@/lib/roles";
import MisIncidencias from "./MisIncidencias";

/** "Mis incidencias" (RF-04): las que registró el usuario de la sesión. Vigilante y Administrador. */
export default function PaginaMisIncidencias() {
  return (
    <RutaProtegida roles={ROLES_REGISTRO}>
      <MisIncidencias />
    </RutaProtegida>
  );
}
