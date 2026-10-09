"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Card } from "@syntaxerror/ui/components/card";
import { enviarJson } from "@/lib/cuenta/cliente";

// Se confirma con un clic (POST) y no al abrir el enlace: los antivirus de correo abren los enlaces por su cuenta.
export function ConfirmarToken({
  endpoint,
  titulo,
  boton,
  exito,
  errores,
}: {
  endpoint: string;
  titulo: string;
  boton: string;
  exito: ReactNode;
  errores: Record<string, string>;
}) {
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState<"inicial" | "enviando" | "listo" | "error">("inicial");
  const [mensaje, setMensaje] = useState("");

  async function confirmar() {
    setEstado("enviando");
    const respuesta = await enviarJson(endpoint, "POST", { token });
    if (respuesta.ok) {
      setEstado("listo");
      return;
    }
    setMensaje((respuesta.error && errores[respuesta.error]) ?? "No pudimos confirmar. Intenta de nuevo.");
    setEstado("error");
  }

  return (
    <Card className="grid gap-4 p-6">
      <h1 className="text-2xl font-black">{titulo}</h1>
      {!token ? (
        <p className="text-muted-foreground">El enlace no trae su código. Ábrelo directamente desde el email.</p>
      ) : estado === "listo" ? (
        <div role="status" className="leading-7">
          {exito}
        </div>
      ) : (
        <>
          <div>
            <Button type="button" onClick={() => void confirmar()} disabled={estado === "enviando"}>
              {boton}
            </Button>
          </div>
          {estado === "error" ? (
            <p role="alert" className="text-sm font-bold text-error-text">
              {mensaje}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
