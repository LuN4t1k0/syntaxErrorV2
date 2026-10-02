"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

export type MarkdownTaskProps = { id: string; enunciado?: string; inicial: string; requisitos: string[]; pistas: string[] };
type Motor = typeof import("@syntaxerror/engines/markdown");

export function MarkdownTask({ id, enunciado, inicial, requisitos, pistas }: MarkdownTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [texto, setTexto] = useState(inicial);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  // markdown-it llega con import(): solo lo descargan las misiones que lo usan.
  const [motor, setMotor] = useState<Motor | null>(null);
  useEffect(() => {
    let vigente = true;
    import("@syntaxerror/engines/markdown").then(
      (modulo) => { if (vigente) setMotor(modulo); },
      () => {}
    );
    return () => { vigente = false; };
  }, []);
  const vista = useMemo(() => (motor ? motor.renderizarMarkdown(texto) : ""), [motor, texto]);
  const cumplidos = useMemo(
    () => new Set(motor && texto.trim() ? requisitos.filter((requisito) => motor.problemasMarkdown(texto, [requisito]).length === 0) : []),
    [motor, texto, requisitos]
  );
  function validar() {
    if (!motor) return;
    const revision = motor.revisarMarkdown(texto, requisitos);
    setResultado(revision);
    registrarResultado(id, revision);
  }
  return (
    <PanelTarea id={id} titulo="tarea de Markdown" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<Button type="button" disabled={!motor} onClick={validar}>Validar</Button>}>
      <div className="grid gap-2 text-sm">
        <p className="font-bold">Tu README debe tener</p>
        <ul className="grid gap-1 leading-6">
          {requisitos.map((requisito) => (
            <li key={requisito} className={cumplidos.has(requisito) ? "text-primary" : "text-muted-foreground"}>
              {`${cumplidos.has(requisito) ? "✓" : "○"} ${motor ? motor.describirRequisitoMarkdown(requisito) : requisito}`}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EditorCodigo etiqueta="Tu README" valor={texto} onCambio={setTexto} filas={14} />
        <div className="grid content-start gap-2 text-sm">
          <p className="font-bold">Vista previa</p>
          <div role="region" aria-label="Vista previa" className="markdown-vista min-h-40 rounded-md border border-border bg-background p-4" dangerouslySetInnerHTML={{ __html: vista }} />
        </div>
      </div>
    </PanelTarea>
  );
}
