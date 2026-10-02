"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

// Una lección de lectura de las aulas de la v1: se piensa la pregunta y, al marcarla como completada, aparece la
// respuesta del curso. No tiene validación automática, igual que en la v1.
export function LecturaTask({ id, pregunta, respuesta }: { id: string; pregunta: string; respuesta: string }) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [vista, setVista] = useState(false);
  const aprobada = tareaAprobada(id);
  function completar() {
    setVista(true);
    registrarResultado(id, { aprobada: true });
  }
  return (
    <PanelTarea
      id={id}
      titulo="para reflexionar"
      enunciado={pregunta}
      aprobada={aprobada}
      resultado={null}
      pistas={[]}
      acciones={aprobada ? null : <Button type="button" onClick={completar}>Ver la respuesta y marcar como completada</Button>}
    >
      {aprobada || vista ? (
        <p className="rounded-md bg-surface-raised p-4 text-sm leading-6">{respuesta}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Piensa tu respuesta antes de ver la del curso.</p>
      )}
    </PanelTarea>
  );
}
