import { Suspense } from "react";
import FormularioLogin from "./FormularioLogin";

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-900 text-2xl font-bold text-white">
            SA
          </div>
          <h1 className="text-xl font-bold text-blue-900">Seguridad Andina</h1>
          <p className="text-sm text-slate-500">Sistema de Gestión de Incidencias</p>
        </div>
        {/* El formulario lee ?motivo= de la URL, por eso va dentro de Suspense */}
        <Suspense>
          <FormularioLogin />
        </Suspense>
      </div>
    </main>
  );
}
