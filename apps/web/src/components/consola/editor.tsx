"use client";

import { useEffect, useState } from "react";
import type { ErrorExplicado } from "@syntaxerror/engines/consola";
import { EditorCodigo } from "@/components/mision/editor-codigo";
import { useTareaDeshabilitada } from "@/components/mision/panel-tarea";
import type { Completado } from "@/lib/consola/completado";
import type { Lenguaje } from "@/lib/consola/glosario";

type Motor = typeof import("./motor-editor");

export type EditorConsolaProps = {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  filas?: number;
  lenguaje: Lenguaje;
  completar: (texto: string, posicion: number) => Completado | null;
  error?: ErrorExplicado | null;
};

// CodeMirror llega con import() después de hidratar: la página sigue estática y liviana. Mientras carga
// (o si la conexión falla) se usa el textarea de siempre, con la misma etiqueta y el mismo texto.
export function EditorConsola({ etiqueta, valor, onCambio, filas = 6, lenguaje, completar, error = null }: EditorConsolaProps) {
  const deshabilitado = useTareaDeshabilitada();
  const [motor, setMotor] = useState<Motor | null>(null);
  useEffect(() => {
    let vigente = true;
    import("./motor-editor").then(
      (modulo) => { if (vigente) setMotor(modulo); },
      () => {}
    );
    return () => { vigente = false; };
  }, []);
  if (!motor) return <EditorCodigo etiqueta={etiqueta} valor={valor} onCambio={onCambio} filas={filas} />;
  return <motor.EditorCodeMirror etiqueta={etiqueta} valor={valor} onCambio={onCambio} filas={filas} lenguaje={lenguaje} completar={completar} error={error} deshabilitado={deshabilitado} />;
}
