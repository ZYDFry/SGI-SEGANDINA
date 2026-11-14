"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { describirCampo, idAyuda } from "@/components/CampoTexto";
import MensajeCampo, { bordeCampo } from "@/components/MensajeCampo";
import type { PropsCampo } from "@/lib/useValidacion";
import { AVISO_TEMPORAL_MS, AYUDA_DNI, LARGO_DNI, limpiarDni, MENSAJES, tieneNoDigitos } from "@/lib/validaciones";

interface Props {
  etiqueta?: string;
  /** Props de `useValidacion().propsCampo(campo)`: id, ref, onBlur y atributos ARIA. */
  props: PropsCampo;
  valor: string;
  /** Recibe el DNI ya limpio (solo dígitos, máximo 8). */
  onCambio: (dni: string) => void;
  /** Aviso en rojo de `useValidacion` (al salir del campo o al enviar). */
  error?: string;
  /** Ayuda fija bajo el campo ("8 dígitos, solo números" por defecto). */
  ayuda?: string;
  placeholder?: string;
  /** Clases de tamaño y tipografía del input en cada pantalla (padding, texto). */
  className?: string;
}

/** Id del aviso temporal "Solo se permiten números". */
function idAviso(campo: string): string {
  return `aviso-${campo}`;
}

/**
 * Campo DNI con la validación a la vista. Solo admite dígitos (máximo 8): lo que no es dígito se bloquea al teclear
 * y se descarta al pegar, y en ambos casos aparece el aviso ámbar "Solo se permiten números" durante 3 s, anunciado
 * por `aria-live`. Muestra un contador "n/8" a la derecha, la ayuda fija debajo y el aviso en rojo de
 * `useValidacion` cuando corresponde.
 */
export default function CampoDni({
  etiqueta = "DNI",
  props,
  valor,
  onCambio,
  error,
  ayuda = AYUDA_DNI,
  placeholder,
  className = "",
}: Props) {
  const [avisoVisible, setAvisoVisible] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const campo = props.id;
  const idContador = `contador-${campo}`;

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  /** Muestra el aviso ámbar y lo oculta a los 3 s; cada intento nuevo reinicia la cuenta. */
  function avisarSoloNumeros() {
    setAvisoVisible(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAvisoVisible(false), AVISO_TEMPORAL_MS);
  }

  /** Bloquea al teclear lo que no sea dígito o pase del octavo, sin que salte el cursor. */
  function alAntesDeEscribir(evento: FormEvent<HTMLInputElement>) {
    const datos = (evento.nativeEvent as InputEvent).data;
    if (!datos) return;
    if (tieneNoDigitos(datos)) {
      avisarSoloNumeros();
      // Varios caracteres de golpe (autocorrector): `alCambiar` conserva sus dígitos.
      if (datos.length === 1) evento.preventDefault();
      return;
    }
    const input = evento.currentTarget;
    const seleccionados = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (datos.length === 1 && input.value.length - seleccionados >= LARGO_DNI) evento.preventDefault();
  }

  /** Pega solo los dígitos en la posición del cursor (antes de que `maxLength` corte el texto con letras). */
  function alPegar(evento: ClipboardEvent<HTMLInputElement>) {
    evento.preventDefault();
    const texto = evento.clipboardData.getData("text");
    if (tieneNoDigitos(texto.trim())) avisarSoloNumeros();
    const input = evento.currentTarget;
    const inicio = input.selectionStart ?? valor.length;
    const fin = input.selectionEnd ?? valor.length;
    onCambio(limpiarDni(valor.slice(0, inicio) + limpiarDni(texto) + valor.slice(fin)));
  }

  /** Cubre lo que no pasa por `beforeinput` (autocompletado, algunos teclados de Android). */
  function alCambiar(texto: string) {
    if (tieneNoDigitos(texto)) avisarSoloNumeros();
    onCambio(limpiarDni(texto));
  }

  return (
    <div>
      <label htmlFor={campo} className="mb-1 block text-sm font-semibold text-slate-700">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          {...props}
          aria-describedby={[describirCampo(props, true), idContador].join(" ")}
          name={campo}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={LARGO_DNI}
          placeholder={placeholder}
          value={valor}
          onBeforeInput={alAntesDeEscribir}
          onPaste={alPegar}
          onChange={(e) => alCambiar(e.target.value)}
          className={`w-full rounded-lg border bg-white pr-14 tracking-widest text-slate-900 placeholder:tracking-normal focus:outline-none focus:ring-2 ${bordeCampo(!!error)} ${className}`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs tabular-nums ${
            valor.length === LARGO_DNI ? "font-semibold text-green-700" : "text-slate-500"
          }`}
        >
          {valor.length}/{LARGO_DNI}
        </span>
        <span id={idContador} className="sr-only">
          {valor.length} de {LARGO_DNI} dígitos
        </span>
      </div>
      <MensajeCampo campo={campo} mensaje={error} />
      {/* Siempre montado para que el lector de pantalla anuncie el aviso al aparecer. */}
      <p id={idAviso(campo)} aria-live="polite" className={`text-sm font-medium text-amber-700 ${avisoVisible ? "mt-1" : ""}`}>
        {avisoVisible ? `⚠ ${MENSAJES.soloNumeros}` : ""}
      </p>
      <p id={idAyuda(campo)} className="mt-1 text-xs text-slate-500">
        {ayuda}
      </p>
    </div>
  );
}
