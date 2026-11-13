"use client";

import FormularioCambioContrasena from "@/components/FormularioCambioContrasena";
import RutaProtegida from "@/components/RutaProtegida";
import { ROLES_TODOS } from "@/lib/roles";

/** "Cambiar mi contraseña": cambio voluntario para cualquier rol, con la sesión abierta. */
export default function PaginaMiContrasena() {
  return (
    <RutaProtegida roles={ROLES_TODOS}>
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold text-blue-900">Cambiar mi contraseña</h1>
        <p className="mb-4 text-sm text-slate-500">Escribe tu contraseña actual y la nueva dos veces.</p>
        <FormularioCambioContrasena modo="voluntario" />
      </div>
    </RutaProtegida>
  );
}
