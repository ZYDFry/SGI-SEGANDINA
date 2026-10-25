"use client";

import RutaProtegida from "@/components/RutaProtegida";
import { useSesion } from "@/context/SesionContext";
import { ROLES_GERENCIA } from "@/lib/roles";

/** Dashboard gerencial (Administrador y Supervisor). Los gráficos y KPI se agregan en la siguiente fase. */
export default function PaginaDashboard() {
  return (
    <RutaProtegida roles={ROLES_GERENCIA}>
      <Bienvenida />
    </RutaProtegida>
  );
}

function Bienvenida() {
  const { sesion } = useSesion();
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-blue-900">Dashboard gerencial</h1>
      <p className="mt-2 text-slate-600">
        Hola, {sesion?.usuario.nombres}. Aquí verás las incidencias de hoy, los vigilantes desplegados por zona y los
        gráficos por zona y tipo de evento.
      </p>
      <p className="mt-4 inline-block rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-500">En construcción</p>
    </section>
  );
}
