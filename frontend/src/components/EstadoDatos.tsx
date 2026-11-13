import type { ReactNode } from "react";
import Alerta from "./Alerta";
import Cargando from "./Cargando";
import type { ErrorApi } from "@/lib/api";

interface Props {
  cargando: boolean;
  error: ErrorApi | null;
  /** true si la consulta respondió sin datos. */
  vacio: boolean;
  mensajeVacio?: string;
  onReintentar: () => void;
  children: ReactNode;
}

/**
 * Estado de un gráfico o una tabla: cargando, error con "Reintentar", mensaje sin datos o el contenido. Un 400 del
 * backend muestra también sus detalles (p. ej. el rango de fechas no válido).
 */
export default function EstadoDatos({
  cargando,
  error,
  vacio,
  mensajeVacio = "No hay incidencias en este periodo.",
  onReintentar,
  children,
}: Props) {
  if (cargando) return <Cargando />;
  if (error) {
    return (
      <div className="py-4">
        <Alerta tipo="error">
          <p>{error.mensaje}</p>
          {error.detalles.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {error.detalles.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onReintentar} className="mt-2 font-semibold underline">
            Reintentar
          </button>
        </Alerta>
      </div>
    );
  }
  if (vacio) {
    return <p className="py-10 text-center text-sm text-slate-500">{mensajeVacio}</p>;
  }
  return <>{children}</>;
}
