import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { verificarTokenSocket } from "@syntaxerror/queue/token-socket";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn(), cerrarSesion: vi.fn() }));
vi.mock("@/lib/tutor/cola", () => ({ encolarTutor: vi.fn(async () => {}) }));
vi.mock("@/lib/tutor/proveedor", async () => {
  const { crearProveedorPrueba } = await import("@syntaxerror/ia/prueba");
  const proveedor = crearProveedorPrueba();
  return { proveedorIA: () => proveedor };
});

vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
vi.stubEnv("CHAT_SOCKET_SECRET", "secreto-de-prueba");

const token = await import("./token/route");
const preguntas = await import("./preguntas/route");
const consulta = await import("./preguntas/[id]/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { encolarTutor } = await import("@/lib/tutor/cola");
const { db, close } = createTestDb();

function preguntar(cuerpo: unknown) {
  return preguntas.POST(
    new Request("http://localhost:3000/api/tutor/preguntas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

const pregunta = (texto = "¿Cómo filtro los clientes?") => ({
  caso: "demo-motor",
  mision: "01-clientes-de-regiones",
  pregunta: texto,
  clientId: "c1",
});

async function iniciarSesion(): Promise<string> {
  const [usuario] = await db.insert(users).values({ email: `ana-${Date.now()}@correo.cl` }).returning({ id: users.id });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
  return usuario.id;
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
  await db
    .insert(casos)
    .values({ slug: "demo-motor", titulo: "Demo", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] });
});
afterAll(() => close());

describe("/api/tutor", () => {
  it("token: pide sesión y firma un token para ese navegador", async () => {
    const pedir = (clientId: string) => token.GET(new Request(`http://localhost:3000/api/tutor/token?clientId=${clientId}`));
    expect((await pedir("c1")).status).toBe(401);
    const userId = await iniciarSesion();
    const { token: firmado } = await (await pedir("c1")).json();
    expect(verificarTokenSocket({ token: firmado, clientId: "c1", proposito: "tutor", secreto: "secreto-de-prueba" })).toEqual({ userId });
    expect((await token.GET(new Request("http://localhost:3000/api/tutor/token"))).status).toBe(400);
  });

  it("preguntas: pide sesión y responde 404 si la misión no existe", async () => {
    expect((await preguntar(pregunta())).status).toBe(401);
    await iniciarSesion();
    expect((await preguntar({ ...pregunta(), mision: "no-existe" })).status).toBe(404);
  });

  it("preguntas: encola y la consulta devuelve la pregunta pendiente solo a su dueña", async () => {
    await iniciarSesion();
    const respuesta = await preguntar(pregunta());
    const cuerpo = await respuesta.json();
    expect(cuerpo).toMatchObject({ estado: "en_cola" });
    expect(encolarTutor).toHaveBeenCalledTimes(1);

    const consultar = () =>
      consulta.GET(new Request(`http://localhost:3000/api/tutor/preguntas/${cuerpo.preguntaId}`), {
        params: Promise.resolve({ id: cuerpo.preguntaId }),
      });
    expect(await (await consultar()).json()).toEqual({ estado: "pendiente", respuesta: null });
    await iniciarSesion();
    expect((await consultar()).status).toBe(404);
  });

  it("preguntas: desde la número 11 en un minuto responde 429 sin llamar a la IA", async () => {
    await iniciarSesion();
    for (let i = 0; i < 10; i += 1) expect((await preguntar(pregunta(`¿Pregunta ${i} sobre WHERE?`))).status).toBe(200);
    const bloqueada = await preguntar(pregunta("¿Una más sobre WHERE?"));
    expect(bloqueada.status).toBe(429);
    expect(encolarTutor).toHaveBeenCalledTimes(10);
  }, 30_000);
});
