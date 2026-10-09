"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Feedback } from "@syntaxerror/ui/components/feedback";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioRespuesta({ preguntaId }: { preguntaId: string }) {
  const router = useRouter();
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const resultado = await enviarJson(
      `/api/profesor/preguntas/${preguntaId}/respuesta`,
      "POST",
      { respuesta },
    );
    setEnviando(false);
    if (resultado.ok || resultado.status === 404) {
      if (resultado.status === 404) {
        setAviso("Esta pregunta ya fue respondida.");
        setFallo(false);
      }
      router.refresh();
      return;
    }
    setAviso("No pudimos enviar la respuesta. Intenta de nuevo.");
    setFallo(true);
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
          className="field resize-y font-normal leading-6"
        />
      </label>
      <div>
        <Button type="submit" size="sm" disabled={enviando}>
          Enviar respuesta
        </Button>
      </div>
      {aviso ? (
        <Feedback tipo={fallo ? "error" : "success"}>{aviso}</Feedback>
      ) : null}
    </form>
  );
}
