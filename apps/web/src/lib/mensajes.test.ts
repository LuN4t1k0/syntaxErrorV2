import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import { contarNoLeidos, crearMensaje, listarMensajes, marcarLeido } from "./mensajes";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("mensajes internos", () => {
  it("crea el mensaje, avisa por email y se marca como leído solo por su destinataria", async () => {
    const [ana, otra] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl", name: "Ana" }, { email: "otra@correo.cl" }])
      .returning({ id: users.id });
    const id = await crearMensaje(db, { userId: ana.id, remitenteId: null, asunto: "Gracias por tu reporte", cuerpo: "Ya lo arreglamos." }, { encolar });
    expect(enviados).toEqual([
      { tipo: "mensaje-nuevo", para: "ana@correo.cl", nombre: "Ana", asunto: "Gracias por tu reporte", enlace: expect.stringContaining("/dashboard/mensajes") },
    ]);
    expect(await contarNoLeidos(db, ana.id)).toBe(1);

    expect(await marcarLeido(db, otra.id, id!)).toBe(false);
    expect(await marcarLeido(db, ana.id, id!)).toBe(true);
    expect(await marcarLeido(db, ana.id, id!)).toBe(true);
    expect(await contarNoLeidos(db, ana.id)).toBe(0);
    expect(await listarMensajes(db, ana.id)).toEqual([
      { id, asunto: "Gracias por tu reporte", cuerpo: "Ya lo arreglamos.", leido: true, creadoEn: expect.any(Date) },
    ]);
  });

  it("no crea mensajes para una cuenta que no existe", async () => {
    expect(
      await crearMensaje(db, { userId: "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", remitenteId: null, asunto: "Hola", cuerpo: "Hola" }, { encolar })
    ).toBeNull();
    expect(enviados).toEqual([]);
  });
});
