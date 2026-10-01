import { Fragment } from "react";
import type { Lenguaje } from "@/lib/consola/glosario";
import { resaltar } from "@/lib/consola/resaltado";

// Sin "use client": se dibuja en el servidor, así los ejemplos no suman JavaScript al navegador.
export function CodigoResaltado({ codigo, lenguaje }: { codigo: string; lenguaje: Lenguaje }) {
  return (
    <pre className="overflow-x-auto font-mono text-sm leading-6">
      <code>
        {resaltar(codigo, lenguaje).map((segmento, indice) =>
          segmento.clase ? <span key={indice} className={segmento.clase}>{segmento.texto}</span> : <Fragment key={indice}>{segmento.texto}</Fragment>
        )}
      </code>
    </pre>
  );
}
