"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { INTENTOS_PARA_TUTOR, tutorHabilitado } from "@/lib/progreso/ayudas";
import { Conversacion } from "../ia/conversacion";
import { useConversacionIA } from "../ia/use-conversacion";
import { useMisionOpcional } from "./mision-provider";

const AVISOS = {
  limite: "Hiciste muchas preguntas seguidas. Espera un minuto.",
  prohibido: "Todavía no: el tutor se habilita después de intentar la tarea.",
  noDisponible: "El tutor no está disponible ahora. Puedes seguir con la misión.",
  demora: "El tutor está tardando demasiado. Intenta preguntar de nuevo.",
};

export function Tutor({ caso, mision }: { caso: string; mision: string }) {
  const [abierto, setAbierto] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const contexto = useMisionOpcional();
  const fallidos = contexto?.fallidosMision ?? 0;
  const habilitado = !contexto || tutorHabilitado({ fallidos, aprobada: contexto.completa });
  const { sesion, mensajes, enviando, aviso, enviar } = useConversacionIA({ activa: abierto, url: "/api/tutor/preguntas", cuerpo: { caso, mision }, avisos: AVISOS });

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = pregunta.trim();
    if (texto && (await enviar(texto))) setPregunta("");
  }

  if (!abierto) {
    return (
      <div>
        <Button type="button" variant="secondary" onClick={() => setAbierto(true)}>
          Preguntar al tutor
        </Button>
      </div>
    );
  }

  return (
    <section className="card grid gap-4 p-5" aria-label="Tutor">
      <header className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> tutor"}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cerrar
        </Button>
      </header>
      <p className="text-sm text-muted-foreground">Te ayuda a entender la misión con pistas y ejemplos, sin darte la solución.</p>

      {sesion === "no" ? (
        <p className="text-sm">
          <Link className="font-bold text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(`/casos/${caso}/${mision}`)}`}>
            Entra para preguntarle al tutor
          </Link>
        </p>
      ) : !habilitado ? (
        <p role="status" className="text-sm leading-6">
          {`Primero intenta resolver la tarea. El tutor se habilita con ${INTENTOS_PARA_TUTOR} intentos fallidos en esta misión; llevas ${fallidos}.`}
        </p>
      ) : (
        <>
          <Conversacion mensajes={mensajes} pensando="El tutor está pensando…" desdeCache="Respondida desde respuestas anteriores de esta misión." />
          <form className="grid gap-3" onSubmit={alEnviar}>
            <label className="grid gap-2 text-sm font-bold">
              Tu pregunta
              <textarea
                value={pregunta}
                onChange={(evento) => setPregunta(evento.target.value)}
                rows={3}
                maxLength={500}
                required
                className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
              />
            </label>
            <div>
              <Button type="submit" disabled={enviando || sesion === "cargando"}>
                Enviar pregunta
              </Button>
            </div>
            {aviso ? (
              <p role="status" className="text-sm font-bold">
                {aviso}
              </p>
            ) : null}
          </form>
        </>
      )}
    </section>
  );
}
