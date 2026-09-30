"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function PreguntaDocente({ caso, mision }: { caso: string; mision: string }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<"escribiendo" | "enviada" | "sin_sesion">("escribiendo");
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson("/api/preguntas-profesor", "POST", { caso, mision, texto });
    setEnviando(false);
    if (respuesta.ok) {
      setEstado("enviada");
      setTexto("");
    } else if (respuesta.status === 401) setEstado("sin_sesion");
    else if (respuesta.status === 429) setAviso("Ya enviaste varias preguntas esta hora. Intenta más tarde.");
    else if (respuesta.status === 400) setAviso("Escribe tu pregunta con al menos 5 caracteres.");
    else setAviso("No pudimos enviar tu pregunta. Intenta de nuevo.");
  }

  if (!abierto) {
    return (
      <div>
        <Button type="button" variant="secondary" onClick={() => setAbierto(true)}>
          Preguntar a un docente
        </Button>
      </div>
    );
  }

  return (
    <section className="card grid gap-4 p-5" aria-label="Pregunta a un docente">
      <header className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> docente"}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>Cerrar</Button>
      </header>
      <p className="text-sm text-muted-foreground">
        Una persona del equipo docente lee tu pregunta y te responde. Si estás en una clase con este caso, le llega a tu docente.
      </p>
      {estado === "sin_sesion" ? (
        <p className="text-sm">
          <Link className="font-bold text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(`/casos/${caso}/${mision}`)}`}>
            Entra para preguntarle a un docente
          </Link>
        </p>
      ) : estado === "enviada" ? (
        <p role="status" className="text-sm font-bold">
          Tu pregunta quedó enviada. Te avisaremos por email cuando tenga respuesta.{" "}
          <Link className="text-primary hover:underline" href="/dashboard/preguntas">Ver tus preguntas</Link>
        </p>
      ) : (
        <form className="grid gap-3" onSubmit={enviar}>
          <label className="grid gap-2 text-sm font-bold">
            Tu pregunta para el equipo docente
            <textarea
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              rows={4}
              minLength={5}
              maxLength={2000}
              required
              className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
            />
          </label>
          <div>
            <Button type="submit" disabled={enviando}>Enviar al docente</Button>
          </div>
          {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
        </form>
      )}
    </section>
  );
}
