"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Confirmacion } from "@/components/confirmacion";
import { enviarJson } from "@/lib/cuenta/cliente";

// Quita los bloqueos de orden de las rutas a todos los estudiantes. Se pide confirmar, porque cambia la experiencia de
// todas las personas de inmediato.
export function InterruptorOrdenLibre({ activo }: { activo: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  async function cambiar() {
    setEnviando(true);
    const respuesta = await enviarJson("/api/admin/ajustes", "PATCH", { ordenLibre: !activo });
    setEnviando(false);
    setConfirmando(false);
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
        <Button type="button" variant={activo ? "secondary" : "primary"} disabled={enviando} onClick={() => setConfirmando(true)}>
          {activo ? "Volver al orden normal" : "Liberar el orden para todos"}
        </Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
      <Confirmacion
        abierta={confirmando}
        titulo={activo ? "Volver al orden normal" : "Liberar el orden"}
        descripcion={activo ? "Todos los estudiantes volverán a necesitar completar la misión y el caso anterior. Los probadores conservarán el orden libre." : "Todos los estudiantes podrán hacer las rutas en el orden que quieran. El cambio se aplica de inmediato."}
        confirmar={activo ? "Volver al orden normal" : "Liberar el orden para todos"}
        onConfirmar={() => void cambiar()}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}
