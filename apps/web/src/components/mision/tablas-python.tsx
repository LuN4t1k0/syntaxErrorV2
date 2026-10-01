import type { TablaVisible } from "@syntaxerror/engines/python";

function formatear(valor: unknown): string {
  return valor === null || valor === undefined ? "NaN" : String(valor);
}

function filas(cantidad: number): string {
  return cantidad === 1 ? "1 fila" : `${cantidad} filas`;
}

// Cada DataFrame que quedó en una variable, ordenado y paso a paso (propuesta, sección 10).
export function TablasPython({ tablas }: { tablas: TablaVisible[] }) {
  if (tablas.length === 0) return null;
  return (
    <div className="grid gap-3">
      {tablas.map((tabla) => (
        <div key={tabla.nombre} className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left font-mono text-sm">
            <caption className="bg-surface-raised px-3 py-2 text-left font-sans text-xs text-muted-foreground">
              <strong className="font-mono text-sm text-foreground">{tabla.nombre}</strong>
              {` · ${filas(tabla.total)}${tabla.total > tabla.filas.length ? ` (se muestran las primeras ${tabla.filas.length})` : ""}`}
            </caption>
            <thead className="bg-surface-raised">
              <tr>{tabla.columnas.map((columna, indice) => <th key={indice} scope="col" className="px-3 py-2 font-bold">{columna}</th>)}</tr>
            </thead>
            <tbody>
              {tabla.filas.map((fila, indice) => (
                <tr key={indice} className="border-t border-border">
                  {fila.map((valor, columna) => <td key={columna} className="px-3 py-2">{formatear(valor)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
