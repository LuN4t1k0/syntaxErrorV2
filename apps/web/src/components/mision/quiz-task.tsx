"use client";

import { useEffect, useState } from "react";
import { revisarQuiz, type PreguntaQuiz } from "@syntaxerror/engines/quiz";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { mezclar } from "@/lib/mezclar";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

// Un quiz de opción única. Las opciones se mezclan al mostrarse (en las aulas de la v1 la correcta era siempre la
// primera). Con un error se marcan las preguntas a revisar, sin decir la respuesta; al aprobar se ve la explicación.
export function QuizTask({ id, enunciado, preguntas, pistas }: { id: string; enunciado?: string; preguntas: PreguntaQuiz[]; pistas: string[] }) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [ordenes, setOrdenes] = useState<number[][] | null>(null);
  const [respuestas, setRespuestas] = useState<(number | null)[]>(() => preguntas.map(() => null));
  const [resultado, setResultado] = useState<(ResultadoTarea & { incorrectas: number[] }) | null>(null);
  const aprobada = tareaAprobada(id);
  useEffect(() => setOrdenes(preguntas.map((pregunta) => mezclar(pregunta.opciones.map((_, indice) => indice)))), [preguntas]);

  function elegir(pregunta: number, opcion: number) {
    setRespuestas((actuales) => actuales.map((actual, indice) => (indice === pregunta ? opcion : actual)));
  }
  function validar() {
    const revision = revisarQuiz(preguntas, respuestas);
    setResultado(revision);
    registrarResultado(id, revision);
  }
  const mostrarExplicaciones = aprobada || resultado?.aprobada === true;

  return (
    <PanelTarea id={id} titulo="quiz" enunciado={enunciado} aprobada={aprobada} resultado={resultado} pistas={pistas} acciones={<Button type="button" disabled={!ordenes} onClick={validar}>Validar</Button>}>
      {ordenes ? (
        <ol className="grid gap-4">
          {preguntas.map((pregunta, indicePregunta) => {
            const revisar = resultado?.incorrectas.includes(indicePregunta) ?? false;
            return (
              <li key={pregunta.pregunta} className={cn("grid gap-2 rounded-md border p-3", revisar ? "border-destructive" : "border-border")}>
                <fieldset className="grid gap-2">
                  <legend className="font-bold leading-7">{`${indicePregunta + 1}. ${pregunta.pregunta}`}</legend>
                  {ordenes[indicePregunta].map((opcion) => (
                    <label key={opcion} className="flex items-start gap-2 text-sm leading-6">
                      <input type="radio" className="mt-1.5" name={`${id}-${indicePregunta}`} checked={respuestas[indicePregunta] === opcion} onChange={() => elegir(indicePregunta, opcion)} />
                      {pregunta.opciones[opcion]}
                    </label>
                  ))}
                </fieldset>
                {revisar ? <p className="text-sm font-bold text-error-text">Revisa esta pregunta.</p> : null}
                {mostrarExplicaciones ? <p className="text-sm text-muted-foreground">{pregunta.explicacion}</p> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Cargando preguntas…</p>
      )}
    </PanelTarea>
  );
}
