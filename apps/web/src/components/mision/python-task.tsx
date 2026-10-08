"use client";

import { useMemo, useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { errorSimple, type ErrorExplicado } from "@syntaxerror/engines/consola";
import { columnasDeArchivos, type TablaVisible, type VariableVisible } from "@syntaxerror/engines/python";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorConsola } from "@/components/consola/editor";
import { ExplicacionError } from "@/components/consola/explicacion";
import { completarPython, variablesDe } from "@/lib/consola/completado";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { EstadoPython, usePython } from "./python-contexto";
import { TablasPython } from "./tablas-python";
import { VariablesPython } from "./variables-python";

export type PythonTaskProps = { id: string; enunciado?: string; inicial: string; preparacion: string; pruebas: string; pistas: string[] };
const FALLO = "Algo falló al ejecutar Python. Intenta de nuevo.";
const SIN_RESULTADO = "Tu código se ejecutó sin errores, pero no imprimió nada ni dejó variables. Para ver un valor, usa print(...).";

export function PythonTask({ id, enunciado, inicial, preparacion, pruebas, pistas }: PythonTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const python = usePython();
  const [codigo, setCodigo] = useState(inicial);
  const [salida, setSalida] = useState<string | null>(null);
  const [error, setError] = useState<ErrorExplicado | null>(null);
  const [tablas, setTablas] = useState<TablaVisible[]>([]);
  const [variables, setVariables] = useState<VariableVisible[]>([]);
  const [sinResultado, setSinResultado] = useState(false);
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
  async function ejecutar() {
    setCorriendo(true);
    try {
      const ejecucion = await python.cliente().ejecutar(preparacion, codigo);
      setSalida(ejecucion.salida || null);
      setError(ejecucion.ok ? null : ejecucion.error);
      setTablas(ejecucion.ok ? ejecucion.tablas : []);
      setVariables(ejecucion.ok ? ejecucion.variables : []);
      setSinResultado(ejecucion.ok && !ejecucion.salida && ejecucion.tablas.length === 0 && ejecucion.variables.length === 0);
    } catch {
      setSalida(null);
      setTablas([]);
      setVariables([]);
      setSinResultado(false);
      setError(errorSimple(FALLO));
    } finally {
      setCorriendo(false);
    }
  }
  async function validar() {
    setCorriendo(true);
    try {
      const revision = await python.cliente().revisar({ preparacion, pruebas }, codigo);
      setResultado(revision);
      setSalida(revision.salida || null);
      setError(null);
      setTablas([]);
      setVariables([]);
      setSinResultado(false);
      registrarResultado(id, revision);
    } catch {
      setSalida(null);
      setTablas([]);
      setError(errorSimple(FALLO));
    } finally {
      setCorriendo(false);
    }
  }
  const disponible = python.estado === "listo" && !corriendo;
  return (
    <PanelTarea id={id} titulo="tarea Python" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" disabled={!disponible} onClick={() => void ejecutar()}>Ejecutar</Button><Button type="button" disabled={!disponible} onClick={() => void validar()}>{corriendo ? "Ejecutando…" : "Validar"}</Button></>}>
      <EstadoPython estado={python.estado} onReintentar={python.iniciar} />
      <EditorConsola etiqueta="Código Python" lenguaje="python" valor={codigo} onCambio={setCodigo} filas={8} completar={completar} error={error} />
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
      {sinResultado ? <p className="text-sm text-muted-foreground">{SIN_RESULTADO}</p> : null}
      {error ? <ExplicacionError error={error} /> : null}
      <VariablesPython variables={variables} />
      <TablasPython tablas={tablas} />
    </PanelTarea>
  );
}
