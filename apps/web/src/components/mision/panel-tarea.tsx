"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@syntaxerror/ui/components/badge";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";

export function PanelTarea({
  titulo,
  enunciado,
  aprobada,
  resultado,
  pistas,
  acciones,
  children,
}: {
  titulo: string;
  enunciado?: string;
  aprobada: boolean;
  resultado: ResultadoTarea | null;
  pistas: string[];
  acciones: ReactNode;
  children: ReactNode;
}) {
  const [pistasVistas, setPistasVistas] = useState(0);
  return (
    <section className="card grid gap-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-primary">{`> ${titulo}`}</p>
        {aprobada ? <Badge>Aprobada</Badge> : null}
      </header>
      {enunciado ? <p className="leading-7">{enunciado}</p> : null}
      {children}
      <div className="flex flex-wrap gap-3">
        {acciones}
        {pistasVistas < pistas.length ? (
          <Button type="button" variant="ghost" onClick={() => setPistasVistas((vistas) => vistas + 1)}>
            Ver pista
          </Button>
        ) : null}
      </div>
      {pistasVistas > 0 ? (
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
          {pistas.slice(0, pistasVistas).map((pista) => <li key={pista}>{pista}</li>)}
        </ol>
      ) : null}
      {resultado ? (
        <p role="status" className={resultado.aprobada ? "rounded-md border border-primary/40 bg-primary/10 p-3 text-sm font-bold" : "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive"}>
          {resultado.aprobada ? "¡Tarea aprobada!" : (resultado.diagnostico ?? "Todavía no. Revisa tu respuesta.")}
        </p>
      ) : null}
    </section>
  );
}
