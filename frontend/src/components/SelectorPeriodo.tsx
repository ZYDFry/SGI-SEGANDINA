"use client";

import { useState, type FormEvent } from "react";
import Boton from "@/components/Boton";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import { hoyLima } from "@/lib/fechas";
import type { FiltroPeriodo, Periodo } from "@/lib/tipos";
import { useValidacion, type PropsCampo } from "@/lib/useValidacion";
import { validarRangoFechas, type CampoRango } from "@/lib/validaciones";

export const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: "HOY", etiqueta: "Hoy" },
  { valor: "ULTIMOS_7_DIAS", etiqueta: "7 días" },
  { valor: "ULTIMOS_30_DIAS", etiqueta: "30 días" },
  { valor: "MES_ACTUAL", etiqueta: "Mes actual" },
  { valor: "ANIO_ACTUAL", etiqueta: "Año actual" },
  { valor: "PERSONALIZADO", etiqueta: "Personalizado" },
];

/** Periodo por defecto del backend cuando no se envía (`RangoFechas.PERIODO_POR_DEFECTO`). */
export const PERIODO_INICIAL: FiltroPeriodo = { periodo: "ULTIMOS_30_DIAS" };

const ORDEN: readonly CampoRango[] = ["desde", "hasta"];

interface Props {
  /** Periodo aplicado. */
  valor: FiltroPeriodo;
  /** Se llama con un periodo ya válido: al tocar un predefinido o al aplicar un rango personalizado correcto. */
  onCambio: (periodo: FiltroPeriodo) => void;
}

/**
 * Selector de periodo común del dashboard, el historial, la auditoría y las exportaciones. Los periodos
 * predefinidos se aplican al tocarlos; "Personalizado" muestra dos calendarios (desde y hasta) validados con las
 * mismas reglas del backend (ambas fechas, desde ≤ hasta, máximo 366 días) y se aplica con "Aplicar".
 */
export default function SelectorPeriodo({ valor, onCambio }: Props) {
  const [seleccion, setSeleccion] = useState<Periodo>(valor.periodo);
  const [desde, setDesde] = useState(valor.desde ?? "");
  const [hasta, setHasta] = useState(valor.hasta ?? hoyLima());
  const errores = validarRangoFechas({ desde, hasta });
  const validacion = useValidacion(errores, ORDEN);
  const hoy = hoyLima();

  function elegir(periodo: Periodo) {
    setSeleccion(periodo);
    if (periodo !== "PERSONALIZADO") {
      validacion.reiniciar();
      onCambio({ periodo });
    }
  }

  function aplicar(evento: FormEvent) {
    evento.preventDefault();
    if (!validacion.intentarEnviar()) return;
    onCambio({ periodo: "PERSONALIZADO", desde, hasta });
  }

  const personalizadoPendiente =
    seleccion === "PERSONALIZADO" &&
    (valor.periodo !== "PERSONALIZADO" || valor.desde !== desde || valor.hasta !== hasta);

  return (
    <div>
      <div role="radiogroup" aria-label="Periodo" className="flex flex-wrap gap-1.5">
        {PERIODOS.map((opcion) => {
          const marcada = opcion.valor === seleccion;
          return (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={marcada}
              onClick={() => elegir(opcion.valor)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 ${
                marcada
                  ? "border-blue-900 bg-blue-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>

      {seleccion === "PERSONALIZADO" && (
        <form onSubmit={aplicar} noValidate className="mt-3 flex flex-wrap items-start gap-3">
          <CampoFecha
            etiqueta="Desde"
            valor={desde}
            max={hoy}
            onCambio={(v) => {
              setDesde(v);
              validacion.alCambiar("desde");
            }}
            error={validacion.error("desde")}
            props={validacion.propsCampo("desde")}
          />
          <CampoFecha
            etiqueta="Hasta"
            valor={hasta}
            max={hoy}
            onCambio={(v) => {
              setHasta(v);
              validacion.alCambiar("hasta");
            }}
            error={validacion.error("hasta")}
            props={validacion.propsCampo("hasta")}
          />
          <Boton type="submit" className="mt-6 py-2 text-sm" disabled={validacion.hayErroresVisibles}>
            Aplicar
          </Boton>
          {personalizadoPendiente && !validacion.hayErroresVisibles && (
            <p className="mt-8 text-xs text-slate-500">Pulsa “Aplicar” para usar este rango.</p>
          )}
        </form>
      )}
    </div>
  );
}

interface PropsCampoFecha {
  etiqueta: string;
  valor: string;
  max: string;
  onCambio: (valor: string) => void;
  error?: string;
  props: PropsCampo;
}

function CampoFecha({ etiqueta, valor, max, onCambio, error, props }: PropsCampoFecha) {
  return (
    <div className="w-44">
      <label htmlFor={props.id} className="mb-1 block text-sm font-semibold text-slate-700">
        {etiqueta}
      </label>
      <input
        {...props}
        type="date"
        value={valor}
        max={max}
        onChange={(e) => onCambio(e.target.value)}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-4 ${bordeCampo(!!error)}`}
      />
      <MensajeCampo campo={props.id} mensaje={error} />
    </div>
  );
}
