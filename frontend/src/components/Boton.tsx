import type { ButtonHTMLAttributes } from "react";

const VARIANTES = {
  primario: "bg-blue-900 text-white hover:bg-blue-800 disabled:bg-blue-900/50",
  secundario: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50",
  peligro: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
} as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof VARIANTES;
}

export default function Boton({ variante = "primario", className = "", type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={`rounded-lg px-4 py-3 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  );
}
