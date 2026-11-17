interface Fila {
  /** Id de la zona, tipo o nivel; necesario para elegir la fila. */
  id?: number;
  etiqueta: string;
  valor: number;
}

/**
 * Tabla oculta a la vista con los datos de un gráfico, para lectores de pantalla. Con `onElegir`, cada fila tiene un
 * botón "Filtrar por …" (alternativa con teclado al clic en el gráfico) y la tabla se hace visible mientras uno de
 * sus botones tiene el foco.
 */
export default function TablaAccesible({
  titulo,
  columnas,
  filas,
  seleccionado = null,
  onElegir,
}: {
  titulo: string;
  columnas: [string, string];
  filas: Fila[];
  /** Id elegido (su botón queda con `aria-pressed`). */
  seleccionado?: number | null;
  onElegir?: (id: number) => void;
}) {
  return (
    <table
      className={
        onElegir
          ? "sr-only text-left text-sm focus-within:not-sr-only focus-within:mt-3 focus-within:w-full"
          : "sr-only"
      }
    >
      <caption className="text-left text-xs text-slate-500">{titulo}</caption>
      <thead>
        <tr>
          <th scope="col">{columnas[0]}</th>
          <th scope="col">{columnas[1]}</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={`${f.etiqueta}-${i}`}>
            <td>
              {onElegir && f.id !== undefined ? (
                <button
                  type="button"
                  aria-pressed={seleccionado === f.id}
                  onClick={() => onElegir(f.id!)}
                  className="rounded px-1 text-left font-semibold text-blue-900 underline focus-visible:outline-2 focus-visible:outline-blue-900"
                >
                  Filtrar por {f.etiqueta}
                </button>
              ) : (
                f.etiqueta
              )}
            </td>
            <td>{f.valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
