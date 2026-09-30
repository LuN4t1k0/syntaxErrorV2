"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function BotonMarcarLeido({ id }: { id: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={enviando}
      onClick={async () => {
        setEnviando(true);
        const respuesta = await enviarJson(`/api/mensajes/${id}`, "PATCH");
        setEnviando(false);
        if (respuesta.ok) router.refresh();
      }}
    >
      Marcar como leído
    </Button>
  );
}
