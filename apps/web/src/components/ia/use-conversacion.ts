"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { EVENTO_TUTOR, PROPOSITO_TUTOR, type EventoTutor } from "@syntaxerror/queue/eventos";
import { enviarJson } from "@/lib/cuenta/cliente";

export type EstadoMensaje = "pendiente" | "respondida" | "desde_cache" | "fuera_de_tema" | "error";
export type Mensaje = { id: string; pregunta: string; estado: EstadoMensaje; respuesta: string | null };

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

// La conversación con la IA que comparten el tutor de la misión y el asistente del curso: la sesión, el token del
// socket, la respuesta por socket (o consultando cada 4 s si el socket no está) y los avisos al enviar.
export function useConversacionIA({
  activa,
  url,
  cuerpo,
  avisos,
}: {
  activa: boolean;
  url: string;
  cuerpo: Record<string, string>;
  avisos: { limite: string; prohibido?: string; noDisponible: string; demora: string };
}) {
  const [sesion, setSesion] = useState<"cargando" | "si" | "no">("cargando");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const clienteRef = useRef("");
  const socketRef = useRef<Socket | null>(null);

  const actualizar = useCallback((id: string, cambios: Partial<Mensaje>) => {
    setMensajes((actuales) => actuales.map((mensaje) => (mensaje.id === id ? { ...mensaje, ...cambios } : mensaje)));
  }, []);

  useEffect(() => {
    if (!activa || sesion !== "cargando") return;
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
        setToken(token ?? null);
      })
      .catch(() => {
        if (vigente) setSesion("si");
      });
    return () => {
      vigente = false;
    };
  }, [activa, sesion]);

  useEffect(() => {
    if (!activa || sesion !== "si" || !token || !SOCKET_URL) return;
    const manejarEvento = (evento: EventoTutor) => actualizar(evento.preguntaId, { estado: evento.estado, respuesta: evento.respuesta });
    const socket = io(SOCKET_URL, {
      query: { clientId: clienteRef.current, token, proposito: PROPOSITO_TUTOR },
      transports: ["websocket", "polling"],
    });
    socket.on(EVENTO_TUTOR, manejarEvento);
    socketRef.current = socket;
    return () => {
      socket.off(EVENTO_TUTOR, manejarEvento);
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [activa, sesion, token, actualizar]);

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
        for (const id of ids) actualizar(id, { estado: "error", respuesta: avisos.demora });
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
  }, [pendientes, actualizar, avisos.demora]);

  // Devuelve true si la pregunta quedó en la conversación (para limpiar el campo).
  async function enviar(texto: string): Promise<boolean> {
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson(url, "POST", { ...cuerpo, pregunta: texto, clientId: clienteRef.current });
    setEnviando(false);
    if (respuesta.status === 401) {
      setSesion("no");
      return false;
    }
    if (respuesta.status === 429) {
      setAviso(avisos.limite);
      return false;
    }
    if (respuesta.status === 403 && avisos.prohibido) {
      setAviso(avisos.prohibido);
      return false;
    }
    const datos = respuesta.datos as { estado?: string; preguntaId?: string; respuesta?: string };
    if (!respuesta.ok || datos.estado === "no_disponible" || !datos.preguntaId) {
      setAviso(avisos.noDisponible);
      return false;
    }
    const estado: EstadoMensaje = datos.estado === "en_cola" ? "pendiente" : (datos.estado as EstadoMensaje);
    setMensajes((actuales) => [...actuales, { id: datos.preguntaId!, pregunta: texto, estado, respuesta: datos.respuesta ?? null }]);
    return true;
  }

  return { sesion, mensajes, enviando, aviso, enviar };
}
