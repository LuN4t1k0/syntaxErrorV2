"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
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
  const dialogo = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  useEffect(() => {
    if (abierta && dialogo.current && !dialogo.current.open)
      dialogo.current.showModal();
  }, [abierta]);

  if (!abierta) return null;

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      onCancel={(evento) => {
        evento.preventDefault();
        onCancelar();
      }}
      className="confirm-dialog card border-primary/40 shadow-2xl"
    >
      <header className="grid gap-1">
        <p className="font-mono text-xs font-bold text-accent">
          {"> confirmar"}
        </p>
        <h2 id={tituloId} className="text-xl font-bold tracking-tight">
          {titulo}
        </h2>
      </header>
      <div className="text-sm leading-6 text-muted-foreground">
        {descripcion}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {/* El foco parte en Cancelar: con el teclado se llega directo a los botones y lo seguro es no hacer nada. */}
        <Button type="button" variant="ghost" onClick={onCancelar} autoFocus>
          {cancelar}
        </Button>
        <Button type="button" variant={variante} onClick={onConfirmar}>
          {confirmar}
        </Button>
      </div>
    </dialog>
  );
}
