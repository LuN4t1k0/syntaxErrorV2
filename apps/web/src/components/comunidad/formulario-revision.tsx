"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

const MENSAJES: Record<string, string> = {
  rubrica_incompleta: "Para aprobar, marca todos los criterios de la rúbrica.",
  falta_comentario: "Para pedir cambios, explica qué debe mejorar (al menos 10 caracteres).",
  no_existe: "Este entregable ya fue revisado.",
  prohibido: "No puedes revisar este entregable.",
};

export function FormularioRevision({ entregableId, rubrica }: { entregableId: string; rubrica: string[] }) {
  const router = useRouter();
  const [criterios, setCriterios] = useState<boolean[]>(() => rubrica.map(() => false));
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function revisar(decision: "aprobado" | "observado") {
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson(`/api/revision/entregables/${entregableId}`, "POST", { decision, criterios, comentario: comentario.trim() || null });
    setEnviando(false);
    if (respuesta.ok || respuesta.status === 404) {
      if (!respuesta.ok) setAviso(MENSAJES.no_existe);
      router.refresh();
      return;
    }
    setAviso(MENSAJES[respuesta.error ?? ""] ?? "No se pudo guardar la revisión. Intenta de nuevo.");
  }

  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold">Rúbrica</legend>
        {rubrica.map((criterio, indice) => (
          <label key={criterio} className="flex items-start gap-2 text-sm leading-6">
            <input
              type="checkbox"
              className="mt-1.5"
              checked={criterios[indice]}
              onChange={(evento) => setCriterios((actuales) => actuales.map((valor, posicion) => (posicion === indice ? evento.target.checked : valor)))}
            />
            {criterio}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1 text-sm font-bold">
        Comentario para la persona (obligatorio si pides cambios)
        <textarea
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={enviando} onClick={() => void revisar("aprobado")}>Aprobar entregable</Button>
        <Button type="button" variant="ghost" disabled={enviando} onClick={() => void revisar("observado")}>Pedir cambios</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
