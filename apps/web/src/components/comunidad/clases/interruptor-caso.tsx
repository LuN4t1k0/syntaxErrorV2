"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviarJson } from "@/lib/cuenta/cliente";

export function InterruptorCaso({ claseId, caso, titulo, habilitado }: { claseId: string; caso: string; titulo: string; habilitado: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={habilitado}
        disabled={enviando}
        onChange={async (evento) => {
          setEnviando(true);
          const respuesta = await enviarJson(`/api/profesor/clases/${claseId}/casos/${caso}`, "PATCH", { habilitado: evento.target.checked });
          setEnviando(false);
          if (respuesta.ok) router.refresh();
        }}
      />
      {titulo}
    </label>
  );
}
