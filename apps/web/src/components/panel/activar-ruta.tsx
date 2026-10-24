"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Power } from "lucide-react";

// Activa una ruta desde su tarjeta del panel: queda como tu ruta y el panel se reordena alrededor de ella.
export function ActivarRuta({ slug, titulo }: { slug: string; titulo: string }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);

  async function activar() {
    setGuardando(true);
    setError(false);
    const respuesta = await fetch("/api/cuenta/ruta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta: slug }),
    }).catch(() => null);
    setGuardando(false);
    if (respuesta?.ok) router.refresh();
    else setError(true);
  }

  return (
    <div className="panel-activar">
      <button type="button" className="panel-boton panel-boton-primario" onClick={activar} disabled={guardando} aria-label={`Activar la ruta ${titulo}`}>
        <Power size={15} aria-hidden="true" />
        {guardando ? "Activando…" : "Activar ruta"}
      </button>
      {error ? <p role="alert">No se pudo activar la ruta. Intenta de nuevo.</p> : null}
    </div>
  );
}
