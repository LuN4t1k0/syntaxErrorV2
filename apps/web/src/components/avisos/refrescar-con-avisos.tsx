"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { PROPOSITO_USUARIO } from "@syntaxerror/queue/eventos";

const SOCKET_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "";

export function RefrescarConAvisos({ eventos }: { eventos: string[] }) {
  const router = useRouter();
  const clave = eventos.join(",");

  useEffect(() => {
    if (!SOCKET_URL || !clave) return;
    const clientId = crypto.randomUUID();
    let socket: Socket | null = null;
    let vigente = true;
    void fetch(`/api/avisos/token?clientId=${clientId}`, { cache: "no-store" })
      .then((respuesta) => (respuesta.ok ? (respuesta.json() as Promise<{ token?: string }>) : null))
      .then((datos) => {
        if (!vigente || !datos?.token) return;
        socket = io(SOCKET_URL, { query: { clientId, token: datos.token, proposito: PROPOSITO_USUARIO }, transports: ["websocket", "polling"] });
        for (const evento of clave.split(",")) socket.on(evento, () => router.refresh());
      })
      .catch(() => {});
    return () => {
      vigente = false;
      socket?.close();
    };
  }, [clave, router]);

  return null;
}
