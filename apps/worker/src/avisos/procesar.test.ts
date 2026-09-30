import { describe, expect, it } from "vitest";
import { EVENTO_PREGUNTA_RESPONDIDA, salaUsuario } from "@syntaxerror/queue/eventos";
import { crearProcesadorAvisos } from "./procesar";

describe("crearProcesadorAvisos", () => {
  it("emite el evento en cada sala del trabajo", async () => {
    const emitidos: unknown[][] = [];
    const procesar = crearProcesadorAvisos((sala, evento, datos) => void emitidos.push([sala, evento, datos]));
    await procesar({
      data: { salas: [salaUsuario("u1"), salaUsuario("u2")], evento: EVENTO_PREGUNTA_RESPONDIDA, datos: { preguntaId: "p1" } },
    });
    expect(emitidos).toEqual([
      ["usuario:u1", EVENTO_PREGUNTA_RESPONDIDA, { preguntaId: "p1" }],
      ["usuario:u2", EVENTO_PREGUNTA_RESPONDIDA, { preguntaId: "p1" }],
    ]);
  });
});
