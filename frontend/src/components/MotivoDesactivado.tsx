/**
 * Texto que explica por qué el botón de envío está desactivado: "Revisa el campo DNI: El DNI debe tener 8 dígitos
 * numéricos". El botón lo enlaza con `aria-describedby` y lo repite en `title`.
 *
 * @param primero   resultado de `useValidacion().primerErrorVisible()`
 * @param etiquetas nombre visible de cada campo
 * @return el texto, o `undefined` si no hay avisos visibles
 */
export function textoMotivo<C extends string>(
  primero: { campo: C; mensaje: string } | null,
  etiquetas: Record<C, string>,
): string | undefined {
  return primero ? `Revisa el campo ${etiquetas[primero.campo]}: ${primero.mensaje}` : undefined;
}

/** Párrafo breve junto al botón desactivado; no muestra nada sin texto. */
export default function MotivoDesactivado({ id, texto, className = "" }: { id: string; texto?: string; className?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className={`text-xs text-slate-600 ${className}`}>
      {texto}
    </p>
  );
}
