import path from "node:path";
import { createDb } from "@syntaxerror/db/client";
import { cargarContenido } from "./cargar";
import { sincronizarContenido } from "./sincronizar";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const dir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");

const { db, close } = createDb(url);
try {
  const resultado = await sincronizarContenido(db, await cargarContenido(dir));
  console.log(`[content] sincronizado: ${resultado.rutas} rutas, ${resultado.casos} casos`);
} finally {
  await close();
}
