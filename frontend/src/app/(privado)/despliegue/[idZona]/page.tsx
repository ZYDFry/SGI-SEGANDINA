import { Suspense } from "react";
import Cargando from "@/components/Cargando";
import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_GERENCIA } from "@/lib/roles";
import ZonaDeLaRuta from "./ZonaDeLaRuta";

/** Despliegue de una zona (RF-07): Administrador y Supervisor. Se llega desde el dashboard. */
export default function PaginaZona() {
  return (
    <RutaProtegida roles={ROLES_GERENCIA}>
      {/* Lee la zona de la ruta y los filtros de la URL: Next exige un Suspense alrededor. */}
      <Suspense fallback={<Cargando />}>
        <ZonaDeLaRuta />
      </Suspense>
    </RutaProtegida>
  );
}
