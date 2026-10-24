"use client";

import { useEffect, useState } from "react";

type Estado = "revisando" | "ok" | "falla";

const TEXTO: Record<Estado, string> = {
  revisando: "Checking systems…",
  ok: "All systems operational",
  falla: "Some systems are degraded",
};

// El estado real de la base y la cola, desde /api/health. Se consulta en el navegador para no frenar la página.
export function EstadoSistema() {
  const [estado, setEstado] = useState<Estado>("revisando");
  useEffect(() => {
    let vigente = true;
    fetch("/api/health", { cache: "no-store" })
      .then((respuesta) => vigente && setEstado(respuesta.ok ? "ok" : "falla"))
      .catch(() => vigente && setEstado("falla"));
    return () => {
      vigente = false;
    };
  }, []);
  return (
    <p className="estado-sistema" data-estado={estado}>
      <span aria-hidden="true" />
      {TEXTO[estado]}
    </p>
  );
}
