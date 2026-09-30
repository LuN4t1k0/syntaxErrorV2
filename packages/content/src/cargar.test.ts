import { appendFile, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cargarContenido, ErrorDeContenido } from "./cargar";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));

function enCaso(dir: string, ...partes: string[]) {
  return path.join(dir, "casos", "ventas", ...partes);
}

async function reemplazar(archivo: string, buscar: string, poner: string) {
  const texto = await readFile(archivo, "utf8");
  if (!texto.includes(buscar)) throw new Error(`No encontré "${buscar}" en ${archivo}`);
  await writeFile(archivo, texto.replace(buscar, poner));
}

async function problemasCon(modificar: (dir: string) => Promise<void>): Promise<string[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "contenido-"));
  try {
    await cp(FIXTURE, dir, { recursive: true });
    await modificar(dir);
    await cargarContenido(dir);
    return [];
  } catch (error) {
    if (error instanceof ErrorDeContenido) return error.problemas;
    throw error;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("cargarContenido", () => {
  it("carga rutas, casos, misiones, bloques y datos tipados", async () => {
    const contenido = await cargarContenido(FIXTURE);
    expect(contenido.rutas).toEqual([
      {
        slug: "analista",
        titulo: "Analista de datos",
        cargo: "Analista de datos junior",
        descripcion: "Ruta de prueba para los tests del cargador.",
        estado: "publicada",
        casos: ["ventas"],
      },
    ]);
    const [caso] = contenido.casos;
    expect(caso.misiones.map((mision) => mision.slug)).toEqual(["01-filtrar", "02-hoja", "03-python"]);
    expect(caso.misiones[0]).toMatchObject({ titulo: "Filtrar clientes", tiempo: 10 });
    expect(caso.datos[0].nombre).toBe("clientes");
    expect(caso.datos[0].filas[0]).toEqual({ id: 1, nombre: "Ferretería El Roble", ciudad: "Santiago", monto: 185000 });
    const tarea = caso.misiones[0].bloques.find((bloque) => bloque.tipo === "SqlTask");
    expect(tarea?.props).toMatchObject({ id: "fuera-de-santiago", inicial: "", comparar: "filas-sin-orden" });
  });

  it("nombra la misión listada en caso.yaml que no tiene archivo", async () => {
    const problemas = await problemasCon((dir) => rm(enCaso(dir, "misiones", "02-hoja.mdx")));
    expect(problemas).toContain("casos/ventas/misiones/02-hoja.mdx: no existe, pero caso.yaml la lista en misiones");
  });

  it("nombra el .mdx que no está listado en caso.yaml", async () => {
    const problemas = await problemasCon((dir) =>
      writeFile(enCaso(dir, "misiones", "99-borrador.mdx"), "---\ntitulo: Borrador\ntiempo: 1\n---\n")
    );
    expect(problemas).toContain("casos/ventas/misiones/99-borrador.mdx: no está listada en misiones de caso.yaml");
  });

  it("nombra el archivo con un error de sintaxis MDX", async () => {
    const problemas = await problemasCon((dir) =>
      writeFile(enCaso(dir, "misiones", "01-filtrar.mdx"), '---\ntitulo: F\ntiempo: 1\n---\n\n<SqlTask id="x"\n')
    );
    expect(problemas.some((problema) => problema.startsWith("casos/ventas/misiones/01-filtrar.mdx: "))).toBe(true);
  });

  it("nombra el componente desconocido", async () => {
    const problemas = await problemasCon((dir) => appendFile(enCaso(dir, "misiones", "01-filtrar.mdx"), "\n<Grafico />\n"));
    expect(
      problemas.some(
        (problema) => problema.startsWith("casos/ventas/misiones/01-filtrar.mdx: ") && problema.includes("Grafico")
      )
    ).toBe(true);
  });

  it("exige que el caso declare su entregable", async () => {
    const problemas = await problemasCon((dir) =>
      reemplazar(enCaso(dir, "caso.yaml"), "entregable: Un repositorio con las consultas del caso\n", "")
    );
    expect(problemas).toContain("casos/ventas/caso.yaml: entregable: el caso debe declarar su entregable");
  });

  it("valida las props de cada bloque", async () => {
    const problemas = await problemasCon((dir) =>
      reemplazar(enCaso(dir, "misiones", "01-filtrar.mdx"), 'comparar="filas-sin-orden"', 'comparar="estado-tabla"')
    );
    expect(problemas).toContain(
      'casos/ventas/misiones/01-filtrar.mdx <SqlTask>: verificar: comparar="estado-tabla" necesita la consulta verificar'
    );
  });

  it("avisa cuando una ruta nombra un caso que no existe", async () => {
    const problemas = await problemasCon((dir) =>
      reemplazar(path.join(dir, "rutas", "analista.yaml"), "  - ventas\n", "  - ventas\n  - no-existe\n")
    );
    expect(problemas).toContain('rutas/analista.yaml: el caso "no-existe" no existe en casos/');
  });

  it("rechaza nombres de tabla que no sirven en SQL", async () => {
    const problemas = await problemasCon((dir) => writeFile(enCaso(dir, "datos", "Ventas-Marzo.csv"), "id\n1\n"));
    expect(problemas).toContain(
      "casos/ventas/datos/Ventas-Marzo.csv: el nombre de la tabla debe usar solo minúsculas, números y _"
    );
  });

  it("junta todos los problemas en un solo error", async () => {
    const problemas = await problemasCon(async (dir) => {
      await rm(enCaso(dir, "misiones", "02-hoja.mdx"));
      await writeFile(enCaso(dir, "misiones", "99-borrador.mdx"), "---\ntitulo: Borrador\ntiempo: 1\n---\n");
    });
    expect(problemas).toHaveLength(2);
  });
});
