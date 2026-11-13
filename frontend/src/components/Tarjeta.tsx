import type { ReactNode } from "react";

interface Props {
  titulo: string;
  /** Controles a la derecha del título (p. ej. selector de agrupación). */
  acciones?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Contenedor blanco con título para gráficos y tablas. */
export default function Tarjeta({ titulo, acciones, className = "", children }: Props) {
  return (
    <section className={`min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-blue-900">{titulo}</h2>
        {acciones}
      </div>
      {children}
    </section>
  );
}

interface PropsKpi {
  etiqueta: string;
  valor: number | string | null;
  detalle?: string;
  /** Color del borde izquierdo (hex); por defecto azul marino. */
  color?: string;
  /** Resalta la tarjeta como alerta (texto rojo). */
  alerta?: boolean;
  cargando?: boolean;
}

/** Indicador grande del dashboard. */
export function TarjetaKpi({ etiqueta, valor, detalle, color = "#1c398e", alerta = false, cargando = false }: PropsKpi) {
  return (
    <div className="min-w-0 rounded-2xl border-l-4 bg-white p-4 shadow-sm" style={{ borderLeftColor: color }}>
      <p className="truncate text-sm font-medium text-slate-500">{etiqueta}</p>
      <p className={`mt-1 text-3xl font-bold ${alerta ? "text-red-600" : "text-slate-900"}`} aria-live="polite">
        {cargando || valor === null ? <span className="text-slate-300">—</span> : valor}
      </p>
      {detalle && <p className="mt-1 truncate text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}
