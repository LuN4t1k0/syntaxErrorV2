import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aCsv, generarDespachosRapidos } from "./generadores/despachos-rapidos";
import { generarClinicaCordilleraCentral } from "./generadores/clinica-cordillera-central";
import { generarMinimarketsDelSur } from "./generadores/minimarkets-del-sur";
import { generarTiendaOnlinePewen } from "./generadores/tienda-online-pewen";

// Escribe los datos generados de cada caso en content/casos/<caso>/datos/. Se corre después de cambiar un generador.
const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

const generadores: Record<string, () => Record<string, Record<string, string | number | null>[]>> = {
  "despachos-rapidos": generarDespachosRapidos,
  "minimarkets-del-sur": generarMinimarketsDelSur,
  "tienda-online-pewen": generarTiendaOnlinePewen,
  "clinica-cordillera-central": generarClinicaCordilleraCentral,
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
