"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

// Quita los bloqueos de orden de las rutas a todos los estudiantes. Se pide confirmar, porque cambia la experiencia de
// todas las personas de inmediato.
export function InterruptorOrdenLibre({ activo }: { activo: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function cambiar() {
    const pregunta = activo ? "¿Volver al orden normal para todos los estudiantes?" : "¿Liberar el orden de todas las rutas para todos los estudiantes?";
    if (!window.confirm(pregunta)) return;
    setEnviando(true);
    const respuesta = await enviarJson("/api/admin/ajustes", "PATCH", { ordenLibre: !activo });
    setEnviando(false);
    setAviso(respuesta.ok ? null : "No se pudo cambiar.");
    if (respuesta.ok) router.refresh();
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6">
        {activo ? (
          <>
            <span className="badge mr-2">Orden libre</span>
            Todos los estudiantes hacen las rutas en el orden que quieran.
          </>
        ) : (
          "Orden normal: cada caso se habilita al completar el anterior, y cada misión al aprobar la anterior. Los probadores no tienen estos bloqueos."
        )}
      </p>
      <div>
        <Button type="button" variant={activo ? "secondary" : "primary"} disabled={enviando} onClick={() => void cambiar()}>
          {activo ? "Volver al orden normal" : "Liberar el orden para todos"}
        </Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
