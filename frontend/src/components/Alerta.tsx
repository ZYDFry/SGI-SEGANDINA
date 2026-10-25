import type { ReactNode } from "react";

const ESTILOS = {
  error: "border-red-200 bg-red-50 text-red-700",
  aviso: "border-amber-200 bg-amber-50 text-amber-800",
  exito: "border-green-200 bg-green-50 text-green-800",
} as const;

interface Props {
  tipo: keyof typeof ESTILOS;
  children: ReactNode;
}

export default function Alerta({ tipo, children }: Props) {
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${ESTILOS[tipo]}`}>
      {children}
    </div>
  );
}
