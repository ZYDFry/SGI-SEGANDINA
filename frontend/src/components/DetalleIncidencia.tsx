import { formatearFechaHora } from "@/lib/fechas";
import { coloresGravedad } from "@/lib/gravedad";
import type { NivelGravedad, Zona } from "@/lib/tipos";

/** Insignia de color con el nombre del nivel de gravedad (historial y "Mis incidencias"). */
export function InsigniaGravedad({ nivel }: { nivel: NivelGravedad }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${coloresGravedad(nivel.orden).insignia}`}
    >
      {nivel.nombreNivel}
    </span>
  );
}

interface Props {
  idIncidencia: number;
  descripcion: string;
  fechaRegistro: string;
  zona: Zona;
}

/**
 * Detalle desplegable de una incidencia: la descripción completa y, debajo, el número, cuándo se guardó en el
 * sistema y la ubicación de la zona.
 */
export default function DetalleIncidencia({ idIncidencia, descripcion, fechaRegistro, zona }: Props) {
  return (
    <>
      <p className="whitespace-pre-wrap break-words text-slate-800">{descripcion}</p>
      <p className="mt-2 text-xs text-slate-500">
        N.° {idIncidencia} · Registrada en el sistema el {formatearFechaHora(fechaRegistro)}
        {" · "}
        {zona.distrito}, {zona.provincia}
      </p>
    </>
  );
}
