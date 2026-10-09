"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, PUNTAJE_PARA_APROBAR, PUNTAJES, type Dimension, type Puntaje, type Rubrica } from "@syntaxerror/content/rubrica";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";
import { LARGO_MINIMO_OBSERVACION } from "@/lib/entregables/rubrica";

const MENSAJES: Record<string, string> = {
  puntajes_incompletos: "Pon un puntaje de 1 a 3 en las tres dimensiones.",
  falta_observacion: `Cada dimensión con 1 (Insuficiente) necesita un comentario de al menos ${LARGO_MINIMO_OBSERVACION} caracteres: es lo que la persona va a corregir.`,
  no_existe: "Este entregable ya fue revisado.",
  prohibido: "No puedes revisar este entregable.",
};

const AREA = "field resize-y font-normal leading-6";

export function FormularioRevision({ entregableId, rubrica }: { entregableId: string; rubrica: Rubrica }) {
  const router = useRouter();
  const [puntajes, setPuntajes] = useState<Partial<Record<Dimension, Puntaje>>>({});
  const [observaciones, setObservaciones] = useState<Partial<Record<Dimension, string>>>({});
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const completo = DIMENSIONES.every((dimension) => puntajes[dimension] !== undefined);
  const aprueba = completo && DIMENSIONES.every((dimension) => (puntajes[dimension] ?? 0) >= PUNTAJE_PARA_APROBAR);

  async function revisar() {
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson(`/api/revision/entregables/${entregableId}`, "POST", { puntajes, observaciones, comentario: comentario.trim() || null });
    setEnviando(false);
    if (respuesta.ok || respuesta.status === 404) {
      if (!respuesta.ok) setAviso(MENSAJES.no_existe);
      router.refresh();
      return;
    }
    setAviso(MENSAJES[respuesta.error ?? ""] ?? "No se pudo guardar la revisión. Intenta de nuevo.");
  }

  return (
    <div className="grid gap-4" data-entregable-id={entregableId}>
      {DIMENSIONES.map((dimension) => (
        <fieldset key={dimension} className="grid gap-2 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-bold">{NOMBRES_DIMENSION[dimension]}</legend>
          <p className="text-sm leading-6 text-muted-foreground">{rubrica[dimension]}</p>
          <div className="flex flex-wrap gap-4">
            {PUNTAJES.map((puntaje) => (
              <label key={puntaje} className="flex items-center gap-2 text-sm" title={NIVELES[puntaje].descripcion}>
                <input
                  type="radio"
                  name={`${entregableId}-${dimension}`}
                  value={puntaje}
                  checked={puntajes[dimension] === puntaje}
                  onChange={() => setPuntajes((actuales) => ({ ...actuales, [dimension]: puntaje }))}
                />
                {`${puntaje} · ${NIVELES[puntaje].nombre}`}
              </label>
            ))}
          </div>
          <label className="grid gap-1 text-sm">
            {puntajes[dimension] === 1 ? "Qué debe corregir (obligatorio)" : "Comentario (opcional)"}
            <textarea
              value={observaciones[dimension] ?? ""}
              onChange={(evento) => setObservaciones((actuales) => ({ ...actuales, [dimension]: evento.target.value }))}
              rows={2}
              maxLength={2000}
              className={AREA}
            />
          </label>
        </fieldset>
      ))}
      <label className="grid gap-1 text-sm font-bold">
        Comentario general (opcional)
        <textarea value={comentario} onChange={(evento) => setComentario(evento.target.value)} rows={2} maxLength={2000} className={AREA} />
      </label>
      <p role="status" className="text-sm">
        {!completo
          ? "Pon un puntaje en las tres dimensiones."
          : aprueba
            ? "Resultado: se aprueba (2 o más en las tres dimensiones)."
            : "Resultado: se piden cambios. La persona recibe tus comentarios y puede reenviar sin penalización."}
      </p>
      <div>
        <Button type="button" disabled={enviando || !completo} onClick={() => void revisar()}>Enviar revisión</Button>
      </div>
      {aviso ? <p role="alert" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
