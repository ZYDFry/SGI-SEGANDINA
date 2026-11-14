"use client";

import { useRef, useState } from "react";
import type { Errores } from "@/lib/validaciones";

/** Props de accesibilidad y eventos que se esparcen en un `<input>` o `<textarea>`. */
export interface PropsCampo {
  id: string;
  ref: (elemento: HTMLElement | null) => void;
  onBlur: () => void;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

/** Id del párrafo con el aviso de un campo (`error-<campo>`), para `aria-describedby` y para las pruebas. */
export function idError(campo: string): string {
  return `error-${campo}`;
}

/**
 * Estado de los avisos de un formulario.
 *
 * - Un aviso aparece al salir del campo (`alSalir`) o al intentar enviar, nunca en un campo sin tocar.
 * - Como `errores` se recalcula en cada render, un aviso visible se actualiza mientras se escribe y se va solo
 *   cuando el dato es válido.
 * - Los errores del backend (`ponerErroresServidor`) tienen prioridad y se borran al editar su campo.
 *
 * @param errores errores actuales del formulario (de `validarLogin`, `validarIncidencia`, …)
 * @param orden   campos en el orden en que aparecen, para enfocar el primero con error
 */
export function useValidacion<C extends string>(errores: Errores<C>, orden: readonly C[]) {
  const [tocados, setTocados] = useState<Partial<Record<C, boolean>>>({});
  const [intentoEnvio, setIntentoEnvio] = useState(false);
  const [servidor, setServidor] = useState<Errores<C>>({});
  const elementos = useRef(new Map<C, HTMLElement>());

  /** Aviso visible del campo, o `undefined`. */
  function error(campo: C): string | undefined {
    return servidor[campo] ?? (intentoEnvio || tocados[campo] ? errores[campo] : undefined);
  }

  /** Marca el campo como tocado (llamar en `onBlur`). */
  function alSalir(campo: C) {
    setTocados((actual) => (actual[campo] ? actual : { ...actual, [campo]: true }));
  }

  /** Borra el aviso del backend del campo (llamar al editarlo). */
  function alCambiar(campo: C) {
    setServidor((actual) => {
      if (!actual[campo]) return actual;
      const copia = { ...actual };
      delete copia[campo];
      return copia;
    });
  }

  /** Ref para enfocar el campo (o el primer botón de un selector) cuando es el primero con error. */
  function registrar(campo: C) {
    return (elemento: HTMLElement | null) => {
      if (elemento) elementos.current.set(campo, elemento);
      else elementos.current.delete(campo);
    };
  }

  /** Props del campo: id, ref, `onBlur`, `aria-invalid` y `aria-describedby` apuntando a su aviso. */
  function propsCampo(campo: C): PropsCampo {
    const invalido = !!error(campo);
    return {
      id: campo,
      ref: registrar(campo),
      onBlur: () => alSalir(campo),
      "aria-invalid": invalido,
      "aria-describedby": invalido ? idError(campo) : undefined,
    };
  }

  /**
   * Al pulsar guardar: muestra todos los avisos y, si hay alguno, enfoca el primer campo con error.
   *
   * @return `true` si el formulario se puede enviar
   */
  function intentarEnviar(): boolean {
    setIntentoEnvio(true);
    setServidor({});
    const primero = orden.find((campo) => errores[campo]);
    if (primero) {
      elementos.current.get(primero)?.focus();
      return false;
    }
    return true;
  }

  /** Coloca bajo cada campo los errores que devolvió el backend y enfoca el primero. */
  function ponerErroresServidor(erroresServidor: Errores<C>) {
    setServidor(erroresServidor);
    const primero = orden.find((campo) => erroresServidor[campo]);
    if (primero) elementos.current.get(primero)?.focus();
  }

  /** Vuelve al estado inicial (sin avisos), p. ej. tras un registro exitoso. */
  function reiniciar() {
    setTocados({});
    setIntentoEnvio(false);
    setServidor({});
  }

  /**
   * Primer aviso visible según `orden`, para explicar junto al botón por qué está desactivado.
   *
   * @return el campo y su mensaje, o `null` si no hay avisos visibles
   */
  function primerErrorVisible(): { campo: C; mensaje: string } | null {
    for (const campo of orden) {
      const mensaje = error(campo);
      if (mensaje) return { campo, mensaje };
    }
    return null;
  }

  const hayErroresVisibles = orden.some((campo) => !!error(campo));

  return {
    error,
    alSalir,
    alCambiar,
    registrar,
    propsCampo,
    intentarEnviar,
    ponerErroresServidor,
    reiniciar,
    hayErroresVisibles,
    primerErrorVisible,
  };
}
