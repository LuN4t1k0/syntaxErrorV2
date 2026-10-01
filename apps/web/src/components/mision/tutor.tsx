"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { EVENTO_TUTOR, PROPOSITO_TUTOR, type EventoTutor } from "@syntaxerror/queue/eventos";
import { enviarJson } from "@/lib/cuenta/cliente";
import { tutorHabilitado, umbralTutor } from "@/lib/progreso/ayudas";
import { useMisionOpcional } from "./mision-provider";

type EstadoMensaje = "pendiente" | "respondida" | "desde_cache" | "fuera_de_tema" | "error";
type Mensaje = { id: string; pregunta: string; estado: EstadoMensaje; respuesta: string | null };

const SOCKET_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "";
const CONSULTA_MS = 4_000;
const ESPERA_MAXIMA_MS = 90_000;
const CLAVE_CLIENTE = "syntaxerror:tutor-cliente";

function idDelNavegador(): string {
  try {
    const guardado = sessionStorage.getItem(CLAVE_CLIENTE);
    if (guardado) return guardado;
    const nuevo = crypto.randomUUID();
    sessionStorage.setItem(CLAVE_CLIENTE, nuevo);
    return nuevo;
  } catch {
    return crypto.randomUUID();
  }
}

export function Tutor({ caso, mision, sinGuia = false }: { caso: string; mision: string; sinGuia?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [sesion, setSesion] = useState<"cargando" | "si" | "no">("cargando");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const clienteRef = useRef("");
  const socketRef = useRef<Socket | null>(null);
  const contexto = useMisionOpcional();
  const fallidos = contexto?.fallidosMision ?? 0;
  const habilitado = !contexto || tutorHabilitado({ fallidos, aprobada: contexto.completa, sinGuia });

  const actualizar = useCallback((id: string, cambios: Partial<Mensaje>) => {
    setMensajes((actuales) => actuales.map((mensaje) => (mensaje.id === id ? { ...mensaje, ...cambios } : mensaje)));
  }, []);

  useEffect(() => {
    if (!abierto || sesion !== "cargando") return;
    clienteRef.current ||= idDelNavegador();
    let vigente = true;
    void fetch(`/api/tutor/token?clientId=${encodeURIComponent(clienteRef.current)}`, { cache: "no-store" })
      .then(async (respuesta) => {
        if (!vigente) return;
        if (respuesta.status === 401) {
          setSesion("no");
          return;
        }
        setSesion("si");
        const { token } = respuesta.ok ? ((await respuesta.json()) as { token?: string }) : {};
        if (!token || !SOCKET_URL) return;
        const socket = io(SOCKET_URL, {
          query: { clientId: clienteRef.current, token, proposito: PROPOSITO_TUTOR },
          transports: ["websocket", "polling"],
        });
        socket.on(EVENTO_TUTOR, (evento: EventoTutor) =>
          actualizar(evento.preguntaId, { estado: evento.estado, respuesta: evento.respuesta })
        );
        socketRef.current = socket;
      })
      .catch(() => {
        if (vigente) setSesion("si");
      });
    return () => {
      vigente = false;
    };
  }, [abierto, sesion, actualizar]);

  useEffect(() => () => void socketRef.current?.close(), []);

  const pendientes = mensajes
    .filter((mensaje) => mensaje.estado === "pendiente")
    .map((mensaje) => mensaje.id)
    .join(",");

  useEffect(() => {
    if (!pendientes) return;
    const ids = pendientes.split(",");
    const inicio = Date.now();
    const intervalo = setInterval(() => {
      if (Date.now() - inicio > ESPERA_MAXIMA_MS) {
        clearInterval(intervalo);
        for (const id of ids) {
          actualizar(id, { estado: "error", respuesta: "El tutor está tardando demasiado. Intenta preguntar de nuevo." });
        }
        return;
      }
      for (const id of ids) {
        void fetch(`/api/tutor/preguntas/${id}`, { cache: "no-store" })
          .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
          .then((datos: { estado: EstadoMensaje; respuesta: string | null } | null) => {
            if (datos && datos.estado !== "pendiente") actualizar(id, datos);
          })
          .catch(() => {});
      }
    }, CONSULTA_MS);
    return () => clearInterval(intervalo);
  }, [pendientes, actualizar]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = pregunta.trim();
    if (!texto) return;
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson("/api/tutor/preguntas", "POST", { caso, mision, pregunta: texto, clientId: clienteRef.current });
    setEnviando(false);
    if (respuesta.status === 401) {
      setSesion("no");
      return;
    }
    if (respuesta.status === 429) {
      setAviso("Hiciste muchas preguntas seguidas. Espera un minuto.");
      return;
    }
    if (respuesta.status === 403) {
      setAviso("Todavía no: el tutor se habilita después de intentar la tarea.");
      return;
    }
    const datos = respuesta.datos as { estado?: string; preguntaId?: string; respuesta?: string };
    if (!respuesta.ok || datos.estado === "no_disponible" || !datos.preguntaId) {
      setAviso("El tutor no está disponible ahora. Puedes seguir con la misión.");
      return;
    }
    const estado: EstadoMensaje = datos.estado === "en_cola" ? "pendiente" : (datos.estado as EstadoMensaje);
    setMensajes((actuales) => [...actuales, { id: datos.preguntaId!, pregunta: texto, estado, respuesta: datos.respuesta ?? null }]);
    setPregunta("");
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
          {`Primero intenta resolver la tarea. El tutor se habilita con ${umbralTutor(sinGuia)} intentos fallidos en esta misión; llevas ${fallidos}.`}
        </p>
      ) : (
        <>
          {mensajes.length > 0 ? (
            <ol className="grid gap-3">
              {mensajes.map((mensaje) => (
                <li key={mensaje.id} className="grid gap-2">
                  <p className="justify-self-end rounded-md bg-surface-raised px-3 py-2 text-sm font-bold">{mensaje.pregunta}</p>
                  {mensaje.estado === "pendiente" ? (
                    <p role="status" className="text-sm text-muted-foreground">
                      El tutor está pensando…
                    </p>
                  ) : (
                    <div className="grid gap-1">
                      <p
                        className={cn(
                          "whitespace-pre-wrap rounded-md border p-3 text-sm leading-6",
                          mensaje.estado === "error" || mensaje.estado === "fuera_de_tema" ? "border-destructive/30" : "border-primary/30"
                        )}
                      >
                        {mensaje.respuesta}
                      </p>
                      {mensaje.estado === "desde_cache" ? (
                        <p className="text-xs text-muted-foreground">Respondida desde respuestas anteriores de esta misión.</p>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          ) : null}
          <form className="grid gap-3" onSubmit={enviar}>
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
