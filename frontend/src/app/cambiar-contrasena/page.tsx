import FormularioCambioContrasena from "./FormularioCambioContrasena";

/** Cambio obligatorio de la contraseña temporal. Va fuera de (privado): sin encabezado ni menú. */
export default function PaginaCambiarContrasena() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-900 text-2xl font-bold text-white">
            SA
          </div>
          <h1 className="text-xl font-bold text-blue-900">Cambia tu contraseña</h1>
          <p className="text-sm text-slate-500">
            Tu contraseña es temporal. Debes cambiarla antes de usar el sistema.
          </p>
        </div>
        <FormularioCambioContrasena />
      </div>
    </main>
  );
}
