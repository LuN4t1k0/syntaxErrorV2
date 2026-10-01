"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { errorSimple, type ErrorExplicado } from "@syntaxerror/engines/consola";
import { ExplicacionError } from "@/components/consola/explicacion";
import { usePython } from "./python-contexto";
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

export function PythonEjemplo({ codigo, resaltado }: { codigo: string; resaltado?: ReactNode }) {
  const python = usePython();
  const [salida, setSalida] = useState<string | null>(null);
  const [error, setError] = useState<ErrorExplicado | null>(null);
  const [tablas, setTablas] = useState<TablaVisible[]>([]);
  const [corriendo, setCorriendo] = useState(false);
  async function probar() {
    setCorriendo(true);
    try {
      const ejecucion = await python.cliente().ejecutar("", codigo);
      setSalida(ejecucion.salida || (ejecucion.ok ? "(sin salida)" : null));
      setError(ejecucion.ok ? null : ejecucion.error);
      setTablas(ejecucion.ok ? ejecucion.tablas : []);
    } catch {
      setSalida(null);
      setTablas([]);
      setError(errorSimple("Algo falló al ejecutar Python. Intenta de nuevo."));
    } finally {
      setCorriendo(false);
    }
  }
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      {resaltado ?? <pre className="overflow-x-auto font-mono text-sm">{codigo}</pre>}
      <div><Button type="button" size="sm" variant="secondary" disabled={python.estado !== "listo" || corriendo} onClick={() => void probar()}>Probar ejemplo</Button></div>
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
      {error ? <ExplicacionError error={error} /> : null}
      <TablasPython tablas={tablas} />
    </div>
  );
}
