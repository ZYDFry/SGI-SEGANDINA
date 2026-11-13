/** Pastilla "Activo" / "Inactivo" de las tablas de personal y catálogos (`femenino` para zonas). */
export default function EtiquetaEstado({ activo, femenino = false }: { activo: boolean; femenino?: boolean }) {
  const texto = activo ? (femenino ? "Activa" : "Activo") : femenino ? "Inactiva" : "Inactivo";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        activo ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
      }`}
    >
      {texto}
    </span>
  );
}
