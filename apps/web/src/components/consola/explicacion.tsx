import type { Aviso, ErrorExplicado } from "@syntaxerror/engines/consola";

export function ExplicacionError({ error }: { error: ErrorExplicado }) {
  return (
    <div role="alert" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6">
      <p className="font-bold text-error-text">{error.linea ? `Línea ${error.linea}: ${error.mensaje}` : error.mensaje}</p>
      {error.sugerencia ? <p>{error.sugerencia}</p> : null}
      {error.original && error.original !== error.mensaje ? (
        <details>
          <summary className="cursor-pointer text-muted-foreground">Mensaje original</summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs">{error.original}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function AvisosConsola({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <div role="status" className="grid gap-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm leading-6">
      <p className="font-bold">Revisa esto</p>
      <ul className="grid list-disc gap-1 pl-5">
        {avisos.map((aviso) => <li key={aviso.mensaje}>{aviso.linea ? `Línea ${aviso.linea}: ${aviso.mensaje}` : aviso.mensaje}</li>)}
      </ul>
    </div>
  );
}
