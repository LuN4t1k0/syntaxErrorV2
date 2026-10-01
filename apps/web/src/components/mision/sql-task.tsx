"use client";

import { useMemo, useState } from "react";
import { esquemaDe } from "@syntaxerror/engines/sql-errores";
import { EditorConsola } from "@/components/consola/editor";
import { completarSql } from "@/lib/consola/completado";
import { Button } from "@syntaxerror/ui/components/button";
import { compararSql, ejecutarConsulta, type EjecucionSql, type ModoComparacion, type Tablas } from "@syntaxerror/engines/sql";
import type { Fila, ResultadoTarea } from "@syntaxerror/engines/tipos";
import { AvisosConsola, ExplicacionError } from "@/components/consola/explicacion";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { TablaResultado } from "./tabla-resultado";

export type SqlTaskProps = { id: string; enunciado?: string; inicial: string; comparar: ModoComparacion; verificar?: string; esperadas: Fila[]; pistas: string[]; tablas: Tablas };

// La estructura de las tablas del caso queda siempre a mano (propuesta, sección 10).
function TablasDelCaso({ tablas }: { tablas: Tablas }) {
  return (
    <details open className="text-sm">
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
  const [ejecucion, setEjecucion] = useState<EjecucionSql | null>(null);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const completar = useMemo(() => {
    const esquema = esquemaDe(tablas);
    return (texto: string, posicion: number) => completarSql(texto, posicion, esquema);
  }, [tablas]);
  function ejecutar() {
    setEjecucion(ejecutarConsulta(tablas, consulta, { permitirEscritura: comparar === "estado-tabla" }));
  }
  function validar() {
    const revision = compararSql(tablas, { comparar, verificar, esperadas }, consulta);
    setResultado(revision);
    registrarResultado(id, revision.aprobada);
  }
  return (
    <PanelTarea id={id} titulo="tarea SQL" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" onClick={ejecutar}>Ejecutar</Button><Button type="button" onClick={validar}>Validar</Button></>}>
      <TablasDelCaso tablas={tablas} />
      <EditorConsola etiqueta="Consulta SQL" lenguaje="sql" valor={consulta} onCambio={setConsulta} completar={completar} error={ejecucion && !ejecucion.ok ? ejecucion.error : null} />
      {ejecucion && !ejecucion.ok ? <ExplicacionError error={ejecucion.error} /> : null}
      {ejecucion?.ok ? <AvisosConsola avisos={ejecucion.avisos} /> : null}
      {ejecucion?.ok ? <TablaResultado filas={ejecucion.filas} /> : null}
    </PanelTarea>
  );
}
