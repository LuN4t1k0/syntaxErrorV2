"use client";

import { useMemo, useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { errorSimple, type ErrorExplicado } from "@syntaxerror/engines/consola";
import { columnasDeArchivos, type TablaVisible } from "@syntaxerror/engines/python";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorConsola } from "@/components/consola/editor";
import { ExplicacionError } from "@/components/consola/explicacion";
import { completarPython, variablesDe } from "@/lib/consola/completado";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { EstadoPython, usePython } from "./python-contexto";
import { TablasPython } from "./tablas-python";

export type PythonTaskProps = { id: string; enunciado?: string; inicial: string; preparacion: string; pruebas: string; pistas: string[] };
const FALLO = "Algo falló al ejecutar Python. Intenta de nuevo.";

export function PythonTask({ id, enunciado, inicial, preparacion, pruebas, pistas }: PythonTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const python = usePython();
  const [codigo, setCodigo] = useState(inicial);
  const [salida, setSalida] = useState<string | null>(null);
  const [error, setError] = useState<ErrorExplicado | null>(null);
  const [tablas, setTablas] = useState<TablaVisible[]>([]);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const completar = useMemo(() => {
    const datos = {
      columnas: columnasDeArchivos(python.opciones.archivos),
      archivos: python.opciones.archivos.map((archivo) => archivo.ruta),
      variables: variablesDe(preparacion),
    };
    return (texto: string, posicion: number) => completarPython(texto, posicion, datos);
  }, [python.opciones, preparacion]);
  async function correr(accion: () => Promise<void>) {
    setCorriendo(true);
    try { await accion(); } catch { setSalida(null); setTablas([]); setError(errorSimple(FALLO)); } finally { setCorriendo(false); }
  }
  const ejecutar = () => correr(async () => {
    const ejecucion = await python.cliente().ejecutar(preparacion, codigo);
    setSalida(ejecucion.salida || null);
    setError(ejecucion.ok ? null : ejecucion.error);
    setTablas(ejecucion.ok ? ejecucion.tablas : []);
  });
  const validar = () => correr(async () => {
    const revision = await python.cliente().revisar({ preparacion, pruebas }, codigo);
    setResultado(revision);
    setSalida(revision.salida || null);
    setError(null);
    setTablas([]);
    registrarResultado(id, revision.aprobada);
  });
  const disponible = python.estado === "listo" && !corriendo;
  return (
    <PanelTarea id={id} titulo="tarea Python" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" disabled={!disponible} onClick={() => void ejecutar()}>Ejecutar</Button><Button type="button" disabled={!disponible} onClick={() => void validar()}>{corriendo ? "Ejecutando…" : "Validar"}</Button></>}>
      <EstadoPython estado={python.estado} onReintentar={python.iniciar} />
      <EditorConsola etiqueta="Código Python" lenguaje="python" valor={codigo} onCambio={setCodigo} filas={8} completar={completar} error={error} />
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
      {error ? <ExplicacionError error={error} /> : null}
      <TablasPython tablas={tablas} />
    </PanelTarea>
  );
}
