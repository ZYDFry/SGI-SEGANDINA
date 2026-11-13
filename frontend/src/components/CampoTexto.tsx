"use client";

import type { FormEvent, InputHTMLAttributes, ReactNode } from "react";
import { LARGO_DNI, sonDigitos } from "@/lib/validaciones";
import type { PropsCampo } from "@/lib/useValidacion";
import MensajeCampo, { bordeCampo } from "./MensajeCampo";

export const ESTILO_CAMPO = "w-full rounded-lg border bg-white px-3 py-2.5 focus:outline-none focus:ring-2";

interface PropsEnvoltura {
  etiqueta: string;
  /** Id del control (el mismo del campo en `useValidacion`). */
  campo: string;
  error?: string;
  ayuda?: string;
  opcional?: boolean;
  children: ReactNode;
}

/** Etiqueta, control, aviso en rojo (`error-<campo>`) y ayuda; sirve para inputs, selects y textareas. */
export function EnvolturaCampo({ etiqueta, campo, error, ayuda, opcional, children }: PropsEnvoltura) {
  return (
    <div>
      <label htmlFor={campo} className="mb-1 block text-sm font-semibold text-slate-700">
        {etiqueta}
        {opcional && <span className="font-normal text-slate-400"> (opcional)</span>}
      </label>
      {children}
      <MensajeCampo campo={campo} mensaje={error} />
      {ayuda && (
        <p id={idAyuda(campo)} className="mt-1 text-xs text-slate-500">
          {ayuda}
        </p>
      )}
    </div>
  );
}

/** Id del párrafo de ayuda de un campo. */
export function idAyuda(campo: string): string {
  return `ayuda-${campo}`;
}

/** `aria-describedby` que junta el aviso (si lo hay) y la ayuda (si la hay). */
export function describirCampo(props: PropsCampo, conAyuda: boolean): string | undefined {
  return [props["aria-describedby"], conAyuda ? idAyuda(props.id) : undefined].filter(Boolean).join(" ") || undefined;
}

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "onBlur" | "onChange" | "value"> {
  etiqueta: string;
  /** Props de `useValidacion().propsCampo(campo)`: id, ref, onBlur y atributos ARIA. */
  props: PropsCampo;
  valor: string;
  onCambio: (valor: string) => void;
  /** Aviso visible (`useValidacion().error(campo)`). */
  error?: string;
  /** Texto de ayuda bajo el campo, enlazado con `aria-describedby`. */
  ayuda?: string;
  opcional?: boolean;
}

/**
 * Campo de texto de los formularios de gestión: etiqueta, input con borde según el aviso, aviso en rojo debajo y
 * ayuda, con los atributos de accesibilidad de `useValidacion`.
 */
export default function CampoTexto({
  etiqueta,
  props,
  valor,
  onCambio,
  error,
  ayuda,
  opcional,
  className = "",
  ...resto
}: Props) {
  return (
    <EnvolturaCampo etiqueta={etiqueta} campo={props.id} error={error} ayuda={ayuda} opcional={opcional}>
      <input
        {...resto}
        {...props}
        aria-describedby={describirCampo(props, !!ayuda)}
        name={props.id}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className={`${ESTILO_CAMPO} ${bordeCampo(!!error)} ${className}`}
      />
    </EnvolturaCampo>
  );
}

/**
 * Impide teclear en un DNI un carácter que no sea dígito o que pase del octavo, sin que salte el cursor. Lo que
 * llega de golpe (pegado, autocorrector) no se bloquea entero: `limpiarDni` en `onChange` conserva sus dígitos.
 */
export function bloquearNoDigitos(evento: FormEvent<HTMLInputElement>) {
  const datos = (evento.nativeEvent as InputEvent).data;
  if (!datos || datos.length !== 1) return;
  const input = evento.currentTarget;
  const seleccionados = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
  if (!sonDigitos(datos) || input.value.length - seleccionados >= LARGO_DNI) {
    evento.preventDefault();
  }
}
