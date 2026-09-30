import type { Fila } from "@syntaxerror/engines/tipos";

function formatear(valor: unknown): string {
  return valor === null || valor === undefined ? "NULL" : String(valor);
}

export function TablaResultado({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return <p className="text-sm text-muted-foreground">La consulta no devolvió filas.</p>;
  const columnas = Object.keys(filas[0]);
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left font-mono text-sm">
        <thead className="bg-surface-raised">
          <tr>{columnas.map((columna) => <th key={columna} className="px-3 py-2 font-bold">{columna}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map((fila, indice) => (
            <tr key={indice} className="border-t border-border">
              {columnas.map((columna) => <td key={columna} className="px-3 py-2">{formatear(fila[columna])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
