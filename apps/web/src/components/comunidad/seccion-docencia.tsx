"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";
import type { EstadoDocencia } from "@/lib/docentes";

export function SeccionDocencia({ estadoInicial }: { estadoInicial: EstadoDocencia }) {
  const [estado, setEstado] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (estado === "docente") {
    return (
      <p className="text-sm">
        Tienes acceso docente.{" "}
        <Link className="font-bold text-accent hover:underline" href="/profesor">Ir a tu panel docente</Link>
      </p>
    );
  }
  if (estado === "pendiente") {
    return <p role="status" className="text-sm font-bold">Tu solicitud de acceso docente está en revisión.</p>;
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        ¿Haces clases? Con acceso docente puedes crear clases, asignar casos y responder las preguntas de tus estudiantes.
      </p>
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={enviando}
          onClick={async () => {
            setEnviando(true);
            const respuesta = await enviarJson("/api/docentes/solicitud", "POST");
            setEnviando(false);
            if (respuesta.ok && typeof respuesta.datos.estado === "string") setEstado(respuesta.datos.estado as EstadoDocencia);
            else setAviso("No pudimos enviar la solicitud. Intenta de nuevo.");
          }}
        >
          Pedir acceso docente
        </Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
