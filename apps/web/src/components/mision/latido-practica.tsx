"use client";

import { useEffect } from "react";

const CADA = 60_000;
// Sin tocar teclado ni mouse en este tiempo, la pestaña abierta ya no cuenta como práctica.
const INACTIVO = 2 * 60_000;

// Avisa cada minuto que la lección sigue en uso, para el «tiempo en código» del panel.
export function LatidoPractica() {
  useEffect(() => {
    let ultimaActividad = Date.now();
    let activo = true;
    const marcar = () => {
      ultimaActividad = Date.now();
    };
    const eventos = ["keydown", "pointerdown", "pointermove", "scroll"] as const;
    for (const evento of eventos) window.addEventListener(evento, marcar, { passive: true });
    const intervalo = window.setInterval(() => {
      if (!activo || document.visibilityState !== "visible" || Date.now() - ultimaActividad > INACTIVO) return;
      fetch("/api/practica/latido", { method: "POST", keepalive: true })
        .then((respuesta) => {
          // Sin sesión no hay a quién sumarle minutos: deja de avisar.
          if (respuesta.status === 401) activo = false;
        })
        .catch(() => {});
    }, CADA);
    return () => {
      window.clearInterval(intervalo);
      for (const evento of eventos) window.removeEventListener(evento, marcar);
    };
  }, []);
  return null;
}
