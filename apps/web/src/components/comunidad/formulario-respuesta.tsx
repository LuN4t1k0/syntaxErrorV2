"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioRespuesta({ preguntaId }: { preguntaId: string }) {
  const router = useRouter();
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const resultado = await enviarJson(`/api/profesor/preguntas/${preguntaId}/respuesta`, "POST", { respuesta });
    setEnviando(false);
    if (resultado.ok || resultado.status === 404) {
      if (resultado.status === 404) setAviso("Esta pregunta ya fue respondida.");
      router.refresh();
      return;
    }
    setAviso("No pudimos enviar la respuesta. Intenta de nuevo.");
  }

  return (
    <form className="grid gap-2" onSubmit={enviar}>
      <label className="grid gap-2 text-sm font-bold">
        Tu respuesta
        <textarea
          value={respuesta}
          onChange={(evento) => setRespuesta(evento.target.value)}
          rows={3}
          maxLength={4000}
          required
          className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
        />
      </label>
      <div>
        <Button type="submit" size="sm" disabled={enviando}>Enviar respuesta</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
