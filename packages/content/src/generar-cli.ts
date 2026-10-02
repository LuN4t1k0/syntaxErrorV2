import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aCsv, generarDespachosRapidos } from "./generadores/despachos-rapidos";
import { generarClinicaCordilleraCentral } from "./generadores/clinica-cordillera-central";
import { generarMinimarketsDelSur } from "./generadores/minimarkets-del-sur";
import { generarProyectoFinal } from "./generadores/proyecto-final";
import { generarTiendaOnlinePewen } from "./generadores/tienda-online-pewen";

// Escribe los datos generados de cada caso en content/casos/<caso>/datos/. Se corre después de cambiar un generador.
// Un generador entrega filas (se escriben como CSV estándar) o el texto del archivo tal cual, como el de un portal público.
const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

const generadores: Record<string, () => Record<string, Record<string, string | number | null>[] | string>> = {
  "despachos-rapidos": generarDespachosRapidos,
  "minimarkets-del-sur": generarMinimarketsDelSur,
  "tienda-online-pewen": generarTiendaOnlinePewen,
  "clinica-cordillera-central": generarClinicaCordilleraCentral,
  "proyecto-final": generarProyectoFinal,
};

for (const [caso, generar] of Object.entries(generadores)) {
  for (const [tabla, datos] of Object.entries(generar())) {
    const directorio = path.join(CONTENIDO, "casos", caso, "datos");
    const archivo = path.join(directorio, `${tabla}.csv`);
    const csv = typeof datos === "string" ? datos : aCsv(datos);
    await mkdir(directorio, { recursive: true });
    await writeFile(archivo, csv);
    console.log(`[content] ${path.relative(CONTENIDO, archivo)}: ${csv.split("\n").length - 2} filas`);
  }
}
