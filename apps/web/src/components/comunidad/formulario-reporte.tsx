"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioReporte({ pagina }: { pagina: string }) {
  const [tipo, setTipo] = useState<"error" | "sugerencia">("error");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson("/api/reportes", "POST", { tipo, descripcion, pagina });
    setEnviando(false);
    if (respuesta.ok) {
      setEnviado(true);
      return;
    }
    if (respuesta.status === 429) setAviso("Ya enviaste varios reportes esta hora. Intenta más tarde.");
    else if (respuesta.status === 400) setAviso("Cuéntanos un poco más: escribe al menos 10 caracteres.");
    else setAviso("No pudimos enviar el reporte. Intenta de nuevo.");
  }

  if (enviado) {
    return (
      <div className="grid gap-3">
        <p role="status" className="font-bold">Gracias. Lo vamos a revisar.</p>
        <Link className="font-bold text-primary hover:underline" href={pagina}>Volver a donde estabas</Link>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={enviar}>
      <p className="text-sm text-muted-foreground">{`Página: ${pagina}`}</p>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 text-sm font-bold">¿Qué quieres contarnos?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo" checked={tipo === "error"} onChange={() => setTipo("error")} /> Un error
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo" checked={tipo === "sugerencia"} onChange={() => setTipo("sugerencia")} /> Una sugerencia
        </label>
      </fieldset>
      <label className="grid gap-2 text-sm font-bold">
        Descripción
        <textarea
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          rows={5}
          minLength={10}
          maxLength={2000}
          required
          className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
        />
      </label>
      <div>
        <Button type="submit" disabled={enviando}>Enviar reporte</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
