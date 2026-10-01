"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { compararSql, crearBaseSql, ejecutarSql, type ModoComparacion, type Tablas } from "@syntaxerror/engines/sql";
import type { Fila, ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { TablaResultado } from "./tabla-resultado";

export type SqlTaskProps = { id: string; enunciado?: string; inicial: string; comparar: ModoComparacion; verificar?: string; esperadas: Fila[]; pistas: string[]; tablas: Tablas };

function TablasDelCaso({ tablas }: { tablas: Tablas }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-bold text-muted-foreground">Tablas disponibles</summary>
      <ul className="mt-2 grid gap-1 font-mono">
        {Object.entries(tablas).map(([nombre, filas]) => <li key={nombre}><strong>{nombre}</strong>: {Object.keys(filas[0] ?? {}).join(", ")}</li>)}
      </ul>
    </details>
  );
}

export function SqlTask({ id, enunciado, inicial, comparar, verificar, esperadas, pistas, tablas }: SqlTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [consulta, setConsulta] = useState(inicial);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  function ejecutar() {
    try {
      setFilas(ejecutarSql(crearBaseSql(tablas), consulta, { permitirEscritura: comparar === "estado-tabla" }));
      setError(null);
    } catch (causa) {
      setFilas(null);
      setError(causa instanceof Error ? causa.message : String(causa));
    }
  }
  function validar() {
    const revision = compararSql(tablas, { comparar, verificar, esperadas }, consulta);
    setResultado(revision);
    registrarResultado(id, revision.aprobada);
  }
  return (
    <PanelTarea id={id} titulo="tarea SQL" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" onClick={ejecutar}>Ejecutar</Button><Button type="button" onClick={validar}>Validar</Button></>}>
      <TablasDelCaso tablas={tablas} />
      <EditorCodigo etiqueta="Consulta SQL" valor={consulta} onCambio={setConsulta} />
      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 font-mono text-sm text-destructive">{error}</p> : null}
      {filas ? <TablaResultado filas={filas} /> : null}
    </PanelTarea>
  );
}
