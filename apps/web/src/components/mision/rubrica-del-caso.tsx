import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, PUNTAJE_PARA_APROBAR, PUNTAJES, type Rubrica } from "@syntaxerror/content/rubrica";

// La rúbrica con que se revisa el entregable, a la vista antes de enviarlo: nadie debería enterarse del criterio al
// recibir la nota.
export function RubricaDelCaso({ rubrica }: { rubrica: Rubrica }) {
  return (
    <section aria-labelledby="rubrica-del-caso" className="card grid gap-3 p-5">
      <h2 id="rubrica-del-caso" className="text-xl font-bold">Cómo se revisa tu entregable</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        {`Una persona lo revisa en tres dimensiones, cada una con puntaje de 1 a 3 (${PUNTAJES.map((puntaje) => `${puntaje}: ${NIVELES[puntaje].nombre}`).join(", ")}). Se aprueba con ${PUNTAJE_PARA_APROBAR} o más en las tres. Si una queda en 1, recibes un comentario sobre qué corregir y puedes reenviarlo sin penalización.`}
      </p>
      <dl className="grid gap-3">
        {DIMENSIONES.map((dimension) => (
          <div key={dimension} className="grid gap-0.5">
            <dt className="font-bold">{NOMBRES_DIMENSION[dimension]}</dt>
            <dd className="text-sm leading-6 text-muted-foreground">{rubrica[dimension]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
