import { describe, expect, it } from "vitest";
import { rutasParaSelectorUi } from "./selector";

describe("rutasParaSelectorUi", () => {
  it("agrega primerPasoHref cuando la ruta tiene casos con misiones", () => {
    const [ruta] = rutasParaSelectorUi(
      [
        {
          slug: "data-analyst",
          titulo: "Data Analyst",
          cargo: "Data Analyst",
          descripcion: "Ruta abierta",
          estado: "publicada",
          estadoVigente: "publicada",
          casos: ["herramientas"],
        },
      ],
      [
        {
          tipo: "clases",
          slug: "herramientas",
          titulo: "Herramientas",
          cargo: "",
          empresa: "",
          dataset: "datos",
          entregable: "",
          archivos: [],
          rubrica: { claridad: "", ejecucion: "", coherencia: "" },
          datos: [],
          misiones: [{ slug: "01-git", titulo: "Git", tiempo: 10, sinGuia: false, fuente: "x", bloques: [] }],
        },
      ]
    );
    expect(ruta.primerPasoHref).toBe("/casos/herramientas/01-git");
  });

  it("deja primerPasoHref en null cuando la ruta no tiene casos", () => {
    const [ruta] = rutasParaSelectorUi(
      [
        {
          slug: "proxima",
          titulo: "Próxima",
          cargo: "Cargo",
          descripcion: "Ruta filtrada",
          estado: "filtrada",
          estadoVigente: "filtrada",
          casos: [],
        },
      ],
      []
    );
    expect(ruta.primerPasoHref).toBeNull();
  });
});
