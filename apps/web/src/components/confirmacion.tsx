"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";

type Variante = "primary" | "destructive";

export function Confirmacion({
  abierta,
  titulo,
  descripcion,
  confirmar,
  cancelar = "Cancelar",
  variante = "primary",
  onConfirmar,
  onCancelar,
}: {
  abierta: boolean;
  titulo: string;
  descripcion: ReactNode;
  confirmar: string;
  cancelar?: string;
  variante?: Variante;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  useEffect(() => {
    if (!abierta) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierta, onCancelar]);

  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="confirmacion-titulo" className="card grid w-full max-w-md gap-4 border-primary/40 bg-surface p-5 shadow-2xl">
        <header className="grid gap-1">
          <p className="font-mono text-xs font-bold text-primary">{"> confirmar"}</p>
          <h2 id="confirmacion-titulo" className="text-xl font-black">
            {titulo}
          </h2>
        </header>
        <div className="text-sm leading-6 text-muted-foreground">{descripcion}</div>
        <div className="flex flex-wrap justify-end gap-2">
          {/* El foco parte en Cancelar: con el teclado se llega directo a los botones y lo seguro es no hacer nada. */}
          <Button type="button" variant="ghost" onClick={onCancelar} autoFocus>
            {cancelar}
          </Button>
          <Button type="button" variant={variante} onClick={onConfirmar}>
            {confirmar}
          </Button>
        </div>
      </section>
    </div>
  );
}
