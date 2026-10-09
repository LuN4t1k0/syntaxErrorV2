"use client";

export function EditorCodigo({ etiqueta, valor, onCambio, filas = 6 }: { etiqueta: string; valor: string; onCambio: (valor: string) => void; filas?: number }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {etiqueta}
      <textarea
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        rows={filas}
        spellCheck={false}
        className="field resize-y font-mono font-normal leading-6"
      />
    </label>
  );
}
