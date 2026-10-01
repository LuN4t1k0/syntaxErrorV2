import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Objetivo } from "@/lib/github/revisor";

vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
vi.stubEnv("ENTREGABLES_VERIFICACION", "prueba");
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })) }));
const revisadas: { objetivo: Objetivo; requisitos: string[] }[] = [];
vi.mock("@/lib/github/revisor", async (original) => {
  const modulo = await original<typeof import("@/lib/github/revisor")>();
  return {
    ...modulo,
    revisorDesdeEntorno: () => async (objetivo: Objetivo, requisitos: string[]) => {
      revisadas.push({ objetivo, requisitos });
      return modulo.revisorPrueba(objetivo, requisitos);
    },
  };
});

const { POST } = await import("./route");
const { checkRateLimit } = await import("@/lib/rate-limit");

const CASO = "herramientas-del-oficio";

function revisar(cuerpo: unknown) {
  return POST(new Request("http://localhost:3000/api/github/revisar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
}

beforeEach(() => {
  revisadas.length = 0;
});

describe("POST /api/github/revisar", () => {
  it("revisa el repositorio de la plantilla con los requisitos del contenido, no los del navegador", async () => {
    const respuesta = await revisar({ caso: CASO, mision: "01-tu-primer-repositorio", tarea: "primer-repositorio", usuario: "ana-perez", requisitos: [] });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ aprobada: true, repositorio: "https://github.com/ana-perez/mi-primer-repositorio" });
    expect(revisadas).toEqual([{ objetivo: { dueno: "ana-perez", nombre: "mi-primer-repositorio" }, requisitos: ["publico", "readme"] }]);
  });

  it("en la misión sin guía revisa el enlace que pega la persona", async () => {
    const respuesta = await revisar({ caso: CASO, mision: "07-tu-presentacion", tarea: "presentacion", url: "https://github.com/ana/presentacion-vacio" });
    expect(await respuesta.json()).toEqual({
      aprobada: false,
      problemas: ["El repositorio está vacío: crea al menos el README."],
      reintentable: false,
      repositorio: "https://github.com/ana/presentacion-vacio",
    });
  });

  it("responde 400 si el usuario o el enlace no sirven, y 404 si la tarea no es de GitHub", async () => {
    expect((await revisar({ caso: CASO, mision: "01-tu-primer-repositorio", tarea: "primer-repositorio", usuario: "-ana" })).status).toBe(400);
    expect(await (await revisar({ caso: CASO, mision: "07-tu-presentacion", tarea: "presentacion", url: "ana/presentacion" })).json()).toEqual({ error: "url_invalida" });
    expect((await revisar({ caso: CASO, mision: "02-escribe-un-readme", tarea: "readme-de-proyecto", usuario: "ana" })).status).toBe(404);
    expect((await revisar({ caso: "no-existe", mision: "x", tarea: "y", usuario: "ana" })).status).toBe(404);
    expect((await revisar({ caso: CASO })).status).toBe(400);
    expect(revisadas).toEqual([]);
  });

  it("limita las revisiones por IP", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 });
    const respuesta = await revisar({ caso: CASO, mision: "01-tu-primer-repositorio", tarea: "primer-repositorio", usuario: "ana" });
    expect(respuesta.status).toBe(429);
    expect(respuesta.headers.get("Retry-After")).toBe("120");
  });
});
