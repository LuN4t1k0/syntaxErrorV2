import path from "node:path";
import { cargarContenido, ErrorDeContenido } from "./cargar";
import { crearRevisorPythonNode } from "./revisor-python";
import { validarContenido } from "./validar";

const dir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");

try {
  const contenido = await cargarContenido(dir);
  const problemas = await validarContenido(contenido, { revisarPython: crearRevisorPythonNode() });
  if (problemas.length > 0) {
    console.error(`[content] ${problemas.length} problema(s):\n- ${problemas.join("\n- ")}`);
    process.exit(1);
  }
  const misiones = contenido.casos.reduce((total, caso) => total + caso.misiones.length, 0);
  console.log(`[content] ok: ${contenido.rutas.length} rutas, ${contenido.casos.length} casos, ${misiones} misiones`);
  process.exit(0);
} catch (error) {
  if (error instanceof ErrorDeContenido) {
    console.error(`[content] ${error.message}`);
    process.exit(1);
  }
  throw error;
}
