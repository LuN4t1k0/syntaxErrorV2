import { describe, expect, it } from "vitest";
import { compilarMision, extraerBloques } from "./bloques";

const fuente = `<Brief de="Paula">Necesito los clientes **fuera** de Santiago.</Brief>

<Concepto>
WHERE filtra filas.

<SqlEjemplo consulta="SELECT * FROM clientes" />
</Concepto>

<SqlTask id="filtro" solucion="SELECT 1" comparar="filas-en-orden" pistas={["Usa WHERE", "Otra"]} />
`;

describe("extraerBloques", () => {
  it("devuelve cada bloque con sus props, en orden de aparición", async () => {
    const bloques = await extraerBloques(fuente);
    expect(bloques.map((bloque) => bloque.tipo)).toEqual(["Brief", "Concepto", "SqlEjemplo", "SqlTask"]);
    expect(bloques[3].props).toEqual({
      id: "filtro",
      solucion: "SELECT 1",
      comparar: "filas-en-orden",
      pistas: ["Usa WHERE", "Otra"],
    });
  });

  it("guarda el texto plano de los hijos", async () => {
    const [brief] = await extraerBloques(fuente);
    expect(brief).toEqual({ tipo: "Brief", props: { de: "Paula" }, texto: "Necesito los clientes fuera de Santiago." });
  });

  it("falla con un componente desconocido", async () => {
    await expect(extraerBloques("<Grafico />")).rejects.toThrow(/Grafico/);
  });

  it("falla con un error de sintaxis", async () => {
    await expect(extraerBloques('<SqlTask id="x"')).rejects.toThrow();
  });
});

describe("compilarMision", () => {
  it("devuelve un componente", async () => {
    expect(typeof (await compilarMision("# Hola"))).toBe("function");
  });
});
