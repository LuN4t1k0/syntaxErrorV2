"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { columnaALetra, crearHoja, dimensiones, escribirCelda, formatearValor, leerDireccion, leerFormula, leerValor, revisarHoja, type CeldaEsperada, type Grilla } from "@syntaxerror/engines/sheet";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

export type SheetTaskProps = { id: string; enunciado?: string; grilla: Grilla; celdas: CeldaEsperada[]; pistas: string[] };
const COLUMNAS_EXTRA = 2;
const FILAS_EXTRA = 1;

export function SheetTask({ id, enunciado, grilla, celdas, pistas }: SheetTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [hoja, setHoja] = useState(() => crearHoja(grilla));
  const [version, setVersion] = useState(0);
  const [seleccionada, setSeleccionada] = useState(celdas[0]?.celda ?? "A1");
  const [entrada, setEntrada] = useState("");
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const objetivos = useMemo(() => new Set(celdas.map((celda) => celda.celda)), [celdas]);
  const tamano = useMemo(() => {
    const { filas, columnas } = dimensiones(hoja);
    const posiciones = celdas.map((celda) => leerDireccion(celda.celda));
    return { filas: Math.max(filas, ...posiciones.map((posicion) => posicion.row + 1)) + FILAS_EXTRA, columnas: Math.max(columnas, ...posiciones.map((posicion) => posicion.col + 1)) + COLUMNAS_EXTRA };
  }, [hoja, celdas, version]);
  function seleccionar(a1: string) {
    setSeleccionada(a1);
    setEntrada(leerFormula(hoja, a1) ?? formatearValor(leerValor(hoja, a1)));
  }
  function aplicar() {
    escribirCelda(hoja, seleccionada, entrada);
    setVersion((actual) => actual + 1);
  }
  function alPresionar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    aplicar();
  }
  function validar() {
    const revision = revisarHoja(hoja, { celdas });
    setResultado(revision);
    registrarResultado(id, revision.aprobada);
  }
  function reiniciar() {
    setHoja(crearHoja(grilla));
    setEntrada("");
    setResultado(null);
  }
  return (
    <PanelTarea id={id} titulo="tarea de planilla" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" onClick={validar}>Validar</Button><Button type="button" variant="secondary" onClick={reiniciar}>Reiniciar hoja</Button></>}>
      <div className="flex flex-wrap items-end gap-2">
        <span className="rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-sm font-bold">{seleccionada}</span>
        <label className="grid flex-1 gap-1 text-sm font-bold">Fórmula<input value={entrada} onChange={(evento) => setEntrada(evento.target.value)} onKeyDown={alPresionar} spellCheck={false} placeholder="=SUMA(D2:D7)" className="field font-mono" /></label>
        <Button type="button" variant="secondary" onClick={aplicar}>Aplicar</Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="border-collapse font-mono text-sm">
          <thead><tr><th className="w-10 bg-surface-raised" />{Array.from({ length: tamano.columnas }, (_, columna) => <th key={columna} className="min-w-24 border-l border-border bg-surface-raised px-2 py-1">{columnaALetra(columna)}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: tamano.filas }, (_, fila) => (
              <tr key={fila}>
                <th className="bg-surface-raised px-2 py-1 text-muted-foreground">{fila + 1}</th>
                {Array.from({ length: tamano.columnas }, (_, columna) => {
                  const a1 = `${columnaALetra(columna)}${fila + 1}`;
                  return <td key={a1} className="border-l border-t border-border p-0"><button type="button" aria-label={`Celda ${a1}`} onClick={() => seleccionar(a1)} className={cn("block h-8 w-full min-w-24 truncate px-2 text-left", objetivos.has(a1) && "bg-primary/10", seleccionada === a1 && "outline outline-2 -outline-offset-2 outline-primary")}>{formatearValor(leerValor(hoja, a1))}</button></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelTarea>
  );
}
