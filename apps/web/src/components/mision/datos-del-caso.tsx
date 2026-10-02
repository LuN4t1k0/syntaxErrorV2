import type { Tabla } from "@syntaxerror/content/tipos";

// La muestra del proyecto final imita un archivo público y se separa con punto y coma; el resto, con coma.
const separadorDe = (tabla: Tabla) => ((tabla.csv.split("\n", 1)[0] ?? "").includes(";") ? "punto y coma" : "coma");

// Los datos del caso para descargar: el entregable se hace fuera de la plataforma (planilla, notebook o dashboard).
export function DatosDelCaso({ caso, datos }: { caso: string; datos: Tabla[] }) {
  if (datos.length === 0) return null;
  return (
    <section aria-labelledby="datos-del-caso" className="card grid gap-3 p-5">
      <h2 id="datos-del-caso" className="text-xl font-bold">Datos del caso</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Descárgalos para tu entregable. Son archivos CSV en UTF-8. En Excel ábrelos con Datos → Obtener datos → Desde texto/CSV (así se ven bien las tildes y las columnas); en Google Sheets, con Archivo → Importar; en Python, con pd.read_csv.
      </p>
      <ul className="grid gap-2">
        {datos.map((tabla) => (
          <li key={tabla.nombre} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <a href={`/casos/${caso}/datos/${tabla.nombre}.csv`} download className="font-mono font-bold text-primary hover:underline">{`${tabla.nombre}.csv`}</a>
            <span className="text-sm text-muted-foreground">{`${tabla.filas.length} filas · separado por ${separadorDe(tabla)} · ${Object.keys(tabla.filas[0] ?? {}).join(", ")}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
