import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aCsv, generarDespachosRapidos } from "./generadores/despachos-rapidos";
import { generarMinimarketsDelSur } from "./generadores/minimarkets-del-sur";

// Escribe los datos generados de cada caso en content/casos/<caso>/datos/. Se corre después de cambiar un generador.
const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

const generadores: Record<string, () => Record<string, Record<string, string | number | null>[]>> = {
  "despachos-rapidos": generarDespachosRapidos,
  "minimarkets-del-sur": generarMinimarketsDelSur,
};

for (const [caso, generar] of Object.entries(generadores)) {
  for (const [tabla, filas] of Object.entries(generar())) {
    const directorio = path.join(CONTENIDO, "casos", caso, "datos");
    const archivo = path.join(directorio, `${tabla}.csv`);
    await mkdir(directorio, { recursive: true });
    await writeFile(archivo, aCsv(filas));
    console.log(`[content] ${path.relative(CONTENIDO, archivo)}: ${filas.length} filas`);
  }
}
