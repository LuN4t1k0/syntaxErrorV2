import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cargarContenido } from "./cargar";
import { tareasDeMision } from "./publicacion";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));

describe("cargarContenido", () => {
  it("carga rutas, casos, misiones, bloques y datos", async () => {
    const contenido = await cargarContenido(FIXTURE);
    expect(contenido.rutas.map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect(contenido.casos[0].misiones.map((mision) => mision.slug)).toEqual(["01-filtrar", "02-hoja", "03-python"]);
    expect(tareasDeMision(contenido.casos[0].misiones[0]).map((tarea) => tarea.props.id)).toEqual(["fuera-de-santiago"]);
    expect(contenido.casos[0].datos[0].filas[0]).toMatchObject({ id: 1, ciudad: "Santiago" });
  });
});
