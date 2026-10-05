"use client";

import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Conversacion } from "./conversacion";
import { useConversacionIA } from "./use-conversacion";

const AVISOS = {
  limite: "Llegaste al límite de preguntas al asistente por esta hora. Vuelve a intentarlo más tarde.",
  noDisponible: "El asistente no está disponible ahora. Puedes seguir con el curso.",
  demora: "El asistente está tardando demasiado. Intenta preguntar de nuevo.",
};

// El "Asistente del curso" de la v1: un chat flotante, siempre disponible, para dudas de conceptos. No ve las tareas
// del caso, así que no reemplaza al tutor de cada misión, que se habilita al intentar.
export function AsistenteFlotante({ caso }: { caso: string }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  // Una vez abierto, sigue escuchando: si la respuesta llega con el panel cerrado, el botón lo avisa.
  const [usado, setUsado] = useState(false);
  const [vistas, setVistas] = useState(0);
  const [pregunta, setPregunta] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const fin = useRef<HTMLDivElement>(null);
  const { sesion, mensajes, enviando, aviso, enviar } = useConversacionIA({ activa: usado, url: "/api/asistente/preguntas", cuerpo: { caso }, avisos: AVISOS });
  const respondidas = mensajes.filter((mensaje) => mensaje.estado !== "pendiente").length;
  const sinLeer = !abierto && respondidas > vistas;

  useEffect(() => {
    if (abierto) setVistas(respondidas);
  }, [abierto, respondidas]);

  useEffect(() => {
    if (!abierto) return;
    campo.current?.focus();
    const alPresionar = (evento: KeyboardEvent) => evento.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  useEffect(() => {
    if (abierto) fin.current?.scrollIntoView({ block: "end" });
  }, [abierto, mensajes, aviso]);

  function abrir() {
    setUsado(true);
    setAbierto(true);
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = pregunta.trim();
    if (texto && (await enviar(texto))) setPregunta("");
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 grid justify-items-end gap-3">
      {abierto ? (
        <section aria-label="Asistente del curso" className="grid max-h-[min(36rem,calc(100svh-6rem))] w-[min(calc(100vw-2rem),24rem)] grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-mono text-sm font-black text-primary">{"> asistente_"}</h2>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar el asistente" className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </header>
          <div className="grid content-start gap-3 overflow-y-auto p-4 text-sm leading-6" aria-live="polite">
            <p className="text-muted-foreground">
              Pregúntame sobre programación, SQL, planillas, Python, Power BI o datos. No resuelvo las tareas: para eso están las pistas y el tutor de cada misión.
            </p>
            {sesion === "no" ? (
              <Link className="font-bold text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(ruta)}`}>
                Entra para preguntarle al asistente
              </Link>
            ) : (
              <Conversacion mensajes={mensajes} pensando="El asistente está pensando…" desdeCache="Respondida desde respuestas anteriores de este curso." />
            )}
            {aviso ? (
              <p role="status" className="font-bold">
                {aviso}
              </p>
            ) : null}
            <div ref={fin} />
          </div>
          {sesion === "no" ? null : (
            <form onSubmit={alEnviar} className="flex gap-2 border-t border-border p-3">
              <input
                ref={campo}
                value={pregunta}
                onChange={(evento) => setPregunta(evento.target.value)}
                maxLength={500}
                required
                aria-label="Tu pregunta al asistente"
                placeholder="Escribe tu pregunta"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary sm:text-sm"
              />
              <button
                type="submit"
                disabled={enviando || sesion === "cargando"}
                aria-label="Enviar pregunta al asistente"
                className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        aria-expanded={abierto}
        aria-label={sinLeer ? "Asistente del curso: tienes una respuesta nueva" : "Asistente del curso"}
        className="relative flex items-center gap-2 rounded-full border border-border bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg hover:bg-primary-hover"
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">Asistente</span>
        {sinLeer ? <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-success" /> : null}
      </button>
    </div>
  );
}
