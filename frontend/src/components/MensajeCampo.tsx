import { idError } from "@/lib/useValidacion";

/** Clases del borde de un campo de texto según si tiene un aviso visible. */
export function bordeCampo(invalido: boolean): string {
  return invalido
    ? "border-red-500 focus:border-red-600 focus:ring-red-500/20"
    : "border-slate-300 focus:border-blue-900 focus:ring-blue-900/20";
}

/** Aviso en rojo debajo de un campo (`id="error-<campo>"`); no muestra nada si no hay mensaje. */
export default function MensajeCampo({ campo, mensaje }: { campo: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={idError(campo)} role="alert" className="mt-1 text-sm text-red-600">
      {mensaje}
    </p>
  );
}
