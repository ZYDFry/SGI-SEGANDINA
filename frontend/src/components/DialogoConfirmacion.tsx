"use client";

import { useState, type ReactNode } from "react";
import { errorDeApi } from "@/lib/api";
import Alerta from "./Alerta";
import Boton from "./Boton";
import Modal from "./Modal";

interface Props {
  titulo: string;
  /** Explicación de lo que va a pasar (puede incluir avisos). */
  children: ReactNode;
  textoConfirmar: string;
  /** `peligro` para desactivar; `primario` para activar. */
  variante?: "peligro" | "primario";
  /** Acción a confirmar; si lanza un error de la API, su mensaje se muestra dentro del diálogo. */
  onConfirmar: () => Promise<void>;
  onCerrar: () => void;
}

/**
 * Confirmación antes de una acción (activar o desactivar). Mientras se procesa, los botones quedan desactivados y
 * el diálogo no se cierra; si la API responde con error (p. ej. "No puede desactivar su propia cuenta"), el mensaje
 * aparece en el diálogo y se puede cancelar.
 */
export default function DialogoConfirmacion({
  titulo,
  children,
  textoConfirmar,
  variante = "peligro",
  onConfirmar,
  onCerrar,
}: Props) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setProcesando(true);
    setError(null);
    try {
      await onConfirmar();
    } catch (e) {
      setError(errorDeApi(e).mensaje);
      setProcesando(false);
    }
  }

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} bloqueado={procesando} ancho="sm">
      <div className="space-y-4 text-sm text-slate-700">
        {children}
        {error && <Alerta tipo="error">{error}</Alerta>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </Boton>
          <Boton variante={variante} onClick={confirmar} disabled={procesando}>
            {procesando ? "Procesando…" : textoConfirmar}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
