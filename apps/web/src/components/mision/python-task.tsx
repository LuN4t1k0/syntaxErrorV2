"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { EstadoPython, usePython } from "./python-contexto";

export type PythonTaskProps = { id: string; enunciado?: string; inicial: string; preparacion: string; pruebas: string; pistas: string[] };
const FALLO = "Algo falló al ejecutar Python. Intenta de nuevo.";

export function PythonTask({ id, enunciado, inicial, preparacion, pruebas, pistas }: PythonTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const python = usePython();
  const [codigo, setCodigo] = useState(inicial);
  const [salida, setSalida] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  async function correr(accion: () => Promise<void>) {
    setCorriendo(true);
    try { await accion(); } catch { setSalida(FALLO); } finally { setCorriendo(false); }
  }
  const ejecutar = () => correr(async () => {
    const ejecucion = await python.cliente().ejecutar(preparacion, codigo);
    setSalida(ejecucion.ok ? ejecucion.salida : [ejecucion.salida, ejecucion.error].filter(Boolean).join("\n"));
  });
  const validar = () => correr(async () => {
    const revision = await python.cliente().revisar({ preparacion, pruebas }, codigo);
    setResultado(revision);
    setSalida(revision.salida || null);
    registrarResultado(id, revision.aprobada);
  });
  const disponible = python.estado === "listo" && !corriendo;
  return (
    <PanelTarea id={id} titulo="tarea Python" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" disabled={!disponible} onClick={() => void ejecutar()}>Ejecutar</Button><Button type="button" disabled={!disponible} onClick={() => void validar()}>{corriendo ? "Ejecutando…" : "Validar"}</Button></>}>
      <EstadoPython estado={python.estado} onReintentar={python.iniciar} />
      <EditorCodigo etiqueta="Código Python" valor={codigo} onCambio={setCodigo} filas={8} />
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
    </PanelTarea>
  );
}
