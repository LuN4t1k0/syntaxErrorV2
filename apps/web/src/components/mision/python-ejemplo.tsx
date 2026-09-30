"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { usePython } from "./python-contexto";

export function PythonEjemplo({ codigo }: { codigo: string }) {
  const python = usePython();
  const [salida, setSalida] = useState<string | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  async function probar() {
    setCorriendo(true);
    try {
      const ejecucion = await python.cliente().ejecutar("", codigo);
      setSalida(ejecucion.ok ? ejecucion.salida || "(sin salida)" : ejecucion.error);
    } catch {
      setSalida("Algo falló al ejecutar Python. Intenta de nuevo.");
    } finally {
      setCorriendo(false);
    }
  }
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      <pre className="overflow-x-auto font-mono text-sm">{codigo}</pre>
      <div><Button type="button" size="sm" variant="secondary" disabled={python.estado !== "listo" || corriendo} onClick={() => void probar()}>Probar ejemplo</Button></div>
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
    </div>
  );
}
