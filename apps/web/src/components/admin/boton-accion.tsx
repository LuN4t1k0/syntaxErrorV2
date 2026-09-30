"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

type Props = {
  url: string;
  metodo?: "POST" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  etiqueta: string;
  variante?: "primary" | "secondary" | "ghost" | "destructive";
  confirmar?: string;
};

export function BotonAccion({ url, metodo = "POST", cuerpo, etiqueta, variante = "secondary", confirmar }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar() {
    if (confirmar && !window.confirm(confirmar)) return;
    setEnviando(true);
    setError(null);
    const respuesta = await enviarJson(url, metodo, cuerpo);
    setEnviando(false);
    if (respuesta.ok) router.refresh();
    else setError(respuesta.status === 404 ? "Ya no está disponible: otra persona lo resolvió." : "No se pudo completar. Intenta de nuevo.");
  }

  return (
    <span className="inline-grid gap-1">
      <Button type="button" size="sm" variant={variante} disabled={enviando} onClick={ejecutar}>
        {etiqueta}
      </Button>
      {error ? <span role="status" className="text-xs font-bold">{error}</span> : null}
    </span>
  );
}
