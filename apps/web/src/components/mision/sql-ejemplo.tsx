"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { ejecutarConsulta, type EjecucionSql, type Tablas } from "@syntaxerror/engines/sql";
import { ExplicacionError } from "@/components/consola/explicacion";
import { TablaResultado } from "./tabla-resultado";

export function SqlEjemplo({ consulta, tablas, resaltado }: { consulta: string; tablas: Tablas; resaltado?: ReactNode }) {
  const [ejecucion, setEjecucion] = useState<EjecucionSql | null>(null);
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      {resaltado ?? <pre className="overflow-x-auto font-mono text-sm">{consulta}</pre>}
      <div><Button type="button" size="sm" variant="secondary" onClick={() => setEjecucion(ejecutarConsulta(tablas, consulta))}>Probar ejemplo</Button></div>
      {ejecucion && !ejecucion.ok ? <ExplicacionError error={ejecucion.error} /> : null}
      {ejecucion?.ok ? <TablaResultado filas={ejecucion.filas} /> : null}
    </div>
  );
}
