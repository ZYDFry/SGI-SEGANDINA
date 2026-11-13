export const TAMANOS_PAGINA = [10, 20, 50] as const;

interface Props {
  /** Página actual, desde 0. */
  pagina: number;
  totalPaginas: number;
  totalElementos: number;
  tamano: number;
  onPagina: (pagina: number) => void;
  onTamano: (tamano: number) => void;
}

/** Pie de una tabla paginada en el servidor: total, página actual, anterior/siguiente y tamaño de página. */
export default function Paginacion({ pagina, totalPaginas, totalElementos, tamano, onPagina, onTamano }: Props) {
  const paginas = Math.max(totalPaginas, 1);
  const boton =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <p>
        {totalElementos} {totalElementos === 1 ? "registro" : "registros"} · Página {pagina + 1} de {paginas}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="tamano-pagina" className="text-slate-500">
          Filas
        </label>
        <select
          id="tamano-pagina"
          value={tamano}
          onChange={(e) => onTamano(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
        >
          {TAMANOS_PAGINA.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="button" className={boton} disabled={pagina <= 0} onClick={() => onPagina(pagina - 1)}>
          Anterior
        </button>
        <button type="button" className={boton} disabled={pagina + 1 >= paginas} onClick={() => onPagina(pagina + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
