"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { crearBaseSql, ejecutarSql, type Tablas } from "@syntaxerror/engines/sql";
import type { Fila } from "@syntaxerror/engines/tipos";
import { TablaResultado } from "./tabla-resultado";

export function SqlEjemplo({ consulta, tablas }: { consulta: string; tablas: Tablas }) {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  function probar() {
    try {
      setFilas(ejecutarSql(crearBaseSql(tablas), consulta));
      setError(null);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : String(causa));
    }
  }
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      <pre className="overflow-x-auto font-mono text-sm">{consulta}</pre>
      <div><Button type="button" size="sm" variant="secondary" onClick={probar}>Probar ejemplo</Button></div>
      {error ? <p className="font-mono text-sm text-destructive">{error}</p> : null}
      {filas ? <TablaResultado filas={filas} /> : null}
    </div>
  );
}
