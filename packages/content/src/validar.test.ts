import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cargarContenido } from "./cargar";
import type { Bloque } from "./esquemas";
import type { Contenido, Mision } from "./tipos";
import { validarContenido, type RevisorPython } from "./validar";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));
const aprueba: RevisorPython = async () => ({ aprobada: true, diagnostico: null });
let contenido: Contenido;

beforeEach(async () => {
  contenido = await cargarContenido(FIXTURE);
});

function mision(slug: string): Mision {
  const encontrada = contenido.casos[0].misiones.find((candidata) => candidata.slug === slug);
  if (!encontrada) throw new Error(`No existe la misión ${slug}`);
  return encontrada;
}

function bloque<T extends Bloque["tipo"]>(de: Mision, tipo: T): Extract<Bloque, { tipo: T }> {
  const encontrado = de.bloques.find((candidato): candidato is Extract<Bloque, { tipo: T }> => candidato.tipo === tipo);
  if (!encontrado) throw new Error(`No hay bloque ${tipo}`);
  return encontrado;
}

const validar = () => validarContenido(contenido, { revisarPython: aprueba });

describe("validarContenido", () => {
  it("el fixture no tiene problemas", async () => {
    expect(await validar()).toEqual([]);
  });

  it("rechaza una misión sin tarea práctica", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.bloques = filtrar.bloques.filter((candidato) => candidato.tipo !== "SqlTask");
    expect(await validar()).toContain(
      "casos/ventas/misiones/01-filtrar.mdx: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask o SheetTask)"
    );
  });

  it("rechaza un Brief de más de 150 palabras", async () => {
    bloque(mision("01-filtrar"), "Brief").texto = Array(151).fill("palabra").join(" ");
    expect(await validar()).toContain("casos/ventas/misiones/01-filtrar.mdx: el Brief tiene 151 palabras (máximo 150)");
  });

  it("rechaza ids de tarea repetidos en una misión", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.bloques.push(bloque(filtrar, "SqlTask"));
    expect(await validar()).toContain('casos/ventas/misiones/01-filtrar.mdx: el id de tarea "fuera-de-santiago" está repetido');
  });

  it("rechaza una solución SQL que no pasa su propio validador", async () => {
    bloque(mision("01-filtrar"), "SqlTask").props.solucion = "SELECT nombre FROM clientes WHERE";
    const problemas = await validar();
    expect(
      problemas.some((problema) =>
        problema.startsWith(
          'casos/ventas/misiones/01-filtrar.mdx: la solución de la tarea "fuera-de-santiago" no pasa su propio validador'
        )
      )
    ).toBe(true);
  });

  it("rechaza una solución de planilla incorrecta", async () => {
    bloque(mision("02-hoja"), "SheetTask").props.solucion = { F2: "=SUMA(D2:D3)" };
    expect(await validar()).toContain(
      'casos/ventas/misiones/02-hoja.mdx: la solución de la tarea "total" no pasa su propio validador: La celda F2 muestra "247000" y se espera "487000".'
    );
  });

  it("revisa las tareas de Python con el revisor que recibe", async () => {
    const revisor = vi.fn<RevisorPython>(async () => ({ aprobada: false, diagnostico: "no pasa" }));
    const problemas = await validarContenido(contenido, { revisarPython: revisor });
    expect(problemas).toContain(
      'casos/ventas/misiones/03-python.mdx: la solución de la tarea "promedio" no pasa su propio validador: no pasa'
    );
    expect(revisor).toHaveBeenCalledWith(expect.objectContaining({ id: "promedio" }), contenido.casos[0]);
  });
});
