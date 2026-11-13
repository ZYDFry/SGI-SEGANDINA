"use client";

import { describirCampo, ESTILO_CAMPO, EnvolturaCampo } from "@/components/CampoTexto";
import { bordeCampo } from "@/components/MensajeCampo";
import type { Zona } from "@/lib/tipos";
import type { PropsCampo } from "@/lib/useValidacion";

interface Props {
  props: PropsCampo;
  valor: number | null;
  onCambio: (valor: number | null) => void;
  /** Zonas activas (`GET /api/catalogos/zonas`). */
  zonas: Zona[];
  /** Zona que el usuario ya tiene: se ofrece aunque esté inactiva, porque el backend la conserva. */
  actual: { idZona: number; nombreZona: string } | null;
  obligatoria: boolean;
  error?: string;
}

/**
 * Selector de zona del formulario de personal. Solo ofrece zonas activas más la zona actual del usuario (marcada
 * "inactiva" si ya no está activa). Sin zona es válido salvo para el Vigilante.
 */
export default function CampoZona({ props, valor, onCambio, zonas, actual, obligatoria, error }: Props) {
  const actualInactiva = actual !== null && !zonas.some((z) => z.idZona === actual.idZona);
  const ayuda = obligatoria ? "Obligatoria para el Vigilante." : "Opcional para Administrador y Supervisor.";
  return (
    <EnvolturaCampo etiqueta="Zona asignada" campo={props.id} error={error} ayuda={ayuda}>
      <select
        {...props}
        aria-describedby={describirCampo(props, true)}
        name={props.id}
        value={valor ?? ""}
        onChange={(e) => onCambio(e.target.value === "" ? null : Number(e.target.value))}
        className={`${ESTILO_CAMPO} ${bordeCampo(!!error)}`}
      >
        <option value="">{obligatoria ? "Elige una zona" : "Sin zona"}</option>
        {actualInactiva && <option value={actual.idZona}>{actual.nombreZona} (inactiva)</option>}
        {zonas.map((z) => (
          <option key={z.idZona} value={z.idZona}>
            {z.nombreZona} — {z.distrito}
          </option>
        ))}
      </select>
    </EnvolturaCampo>
  );
}
