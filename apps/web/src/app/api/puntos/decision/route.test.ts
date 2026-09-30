import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");

const { POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { obtenerCaso } = await import("@/lib/contenido");
const { db, close } = createTestDb();

const MISION = "01-clientes-de-regiones";

async function decisionDeLaMision() {
  const caso = await obtenerCaso("demo-motor");
  const bloque = caso!.misiones.find((mision) => mision.slug === MISION)!.bloques.find((candidato) => candidato.tipo === "Decision");
  if (bloque?.tipo !== "Decision") throw new Error("La misión de prueba no tiene una Decision");
  return bloque.props;
}

function enviar(cuerpo: unknown) {
  return POST(
    new Request("http://localhost:3000/api/puntos/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("POST /api/puntos/decision", () => {
  it("sin sesión responde 401", async () => {
    expect((await enviar({ caso: "demo-motor", mision: MISION, pregunta: "x", opcion: "y" })).status).toBe(401);
  });

  it("registra la primera respuesta a una decisión del contenido", async () => {
    const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({ slug: "demo-motor", titulo: "Demo", cargo: "Analista", empresa: "Demo", entregable: "Repo", misiones: [] });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    const { pregunta, opciones } = await decisionDeLaMision();
    const correcta = opciones.find((opcion) => opcion.correcta)!;

    const respuesta = await enviar({ caso: "demo-motor", mision: MISION, pregunta, opcion: correcta.texto });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ correcta: true, puntos: 5 });
  });

  it("responde 400 con datos inválidos y 404 si la misión o la decisión no existen", async () => {
    const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({ slug: "demo-motor", titulo: "Demo", cargo: "Analista", empresa: "Demo", entregable: "Repo", misiones: [] });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    expect((await enviar({ caso: "demo-motor" })).status).toBe(400);
    expect((await enviar({ caso: "demo-motor", mision: "no-existe", pregunta: "x", opcion: "y" })).status).toBe(404);
    expect((await enviar({ caso: "demo-motor", mision: MISION, pregunta: "¿Inventada?", opcion: "y" })).status).toBe(404);
  });
});
