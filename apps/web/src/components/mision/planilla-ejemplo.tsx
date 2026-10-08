import type { ReactNode } from "react";
import { cn } from "@syntaxerror/ui/cn";
import { columnaALetra, crearHoja, leerDireccion, mostrarValor, type Grilla } from "@syntaxerror/engines/sheet";

export type PlanillaEjemploProps = { grilla: Grilla; desde: string; marcar: string[]; children?: ReactNode };

// Lo que muestra la celda: los decimales largos de un promedio se cortan en dos, como el formato de número de Excel.
function textoDeCelda(texto: string): string {
  const numero = Number(texto);
  return texto !== "" && Number.isFinite(numero) && !Number.isInteger(numero) ? String(Number(numero.toFixed(2))) : texto;
}

// Un ejemplo de planilla del Concepto: se calcula con el mismo motor de las tareas y cada fórmula se ve bajo su resultado.
export function PlanillaEjemplo({ grilla, desde, marcar, children }: PlanillaEjemploProps) {
  const inicio = leerDireccion(desde);
  const hoja = crearHoja([...Array.from({ length: inicio.row }, () => []), ...grilla.map((fila) => [...Array.from({ length: inicio.col }, () => null), ...fila])]);
  const columnas = Math.max(...grilla.map((fila) => fila.length));
  const marcadas = new Set(marcar);
  return (
    <figure className="grid gap-2">
      <div className="w-fit max-w-full overflow-x-auto rounded-md border border-border">
        <table className="border-collapse font-mono text-sm">
          <thead>
            <tr>
              <th className="w-10 bg-surface-raised" />
              {Array.from({ length: columnas }, (_, columna) => <th key={columna} className="min-w-24 border-l border-border bg-surface-raised px-2 py-1">{columnaALetra(inicio.col + columna)}</th>)}
            </tr>
          </thead>
          <tbody>
            {grilla.map((fila, posicionFila) => (
              <tr key={posicionFila}>
                <th className="bg-surface-raised px-2 py-1 text-muted-foreground">{inicio.row + posicionFila + 1}</th>
                {Array.from({ length: columnas }, (_, posicionColumna) => {
                  const a1 = `${columnaALetra(inicio.col + posicionColumna)}${inicio.row + posicionFila + 1}`;
                  const contenido = fila[posicionColumna];
                  const formula = typeof contenido === "string" && contenido.startsWith("=") ? contenido : null;
                  return (
                    <td key={a1} className={cn("h-8 min-w-24 border-l border-t border-border px-2 py-1 align-top", formula && "bg-primary/10", marcadas.has(a1) && "outline outline-2 -outline-offset-2 outline-primary")}>
                      <span className="block whitespace-nowrap">{textoDeCelda(mostrarValor(hoja, a1))}</span>
                      {formula ? <code className="block whitespace-nowrap text-xs text-muted-foreground">{formula}</code> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children ? <figcaption className="text-sm text-muted-foreground">{children}</figcaption> : null}
    </figure>
  );
}
