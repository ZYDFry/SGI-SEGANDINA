/** Tabla oculta a la vista con los datos de un gráfico, para lectores de pantalla. */
export default function TablaAccesible({
  titulo,
  columnas,
  filas,
}: {
  titulo: string;
  columnas: [string, string];
  filas: { etiqueta: string; valor: number }[];
}) {
  return (
    <table className="sr-only">
      <caption>{titulo}</caption>
      <thead>
        <tr>
          <th scope="col">{columnas[0]}</th>
          <th scope="col">{columnas[1]}</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={`${f.etiqueta}-${i}`}>
            <td>{f.etiqueta}</td>
            <td>{f.valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
