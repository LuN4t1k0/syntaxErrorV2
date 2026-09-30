"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

type Estado = "pendiente" | "activa" | "retirada";

export function BotonesInscripcion({ claseId, userId, estado, nombre }: { claseId: string; userId: string; estado: Estado; nombre: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function decidir(nuevo: "activa" | "retirada") {
    setEnviando(true);
    const respuesta = await enviarJson(`/api/profesor/clases/${claseId}/estudiantes/${userId}`, "PATCH", { estado: nuevo });
    setEnviando(false);
    if (respuesta.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {estado !== "activa" ? (
        <Button type="button" size="sm" disabled={enviando} onClick={() => decidir("activa")} aria-label={`Aceptar a ${nombre}`}>
          {estado === "pendiente" ? "Aceptar" : "Volver a aceptar"}
        </Button>
      ) : null}
      {estado !== "retirada" ? (
        <Button type="button" size="sm" variant="ghost" disabled={enviando} onClick={() => decidir("retirada")} aria-label={`${estado === "pendiente" ? "Rechazar" : "Retirar"} a ${nombre}`}>
          {estado === "pendiente" ? "Rechazar" : "Retirar de la clase"}
        </Button>
      ) : null}
    </div>
  );
}
