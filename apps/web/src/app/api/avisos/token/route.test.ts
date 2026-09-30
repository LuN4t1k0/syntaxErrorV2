import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROPOSITO_USUARIO } from "@syntaxerror/queue/eventos";
import { verificarTokenSocket } from "@syntaxerror/queue/token-socket";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.stubEnv("CHAT_SOCKET_SECRET", "secreto-de-prueba");

const { GET } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");

const pedir = (clientId: string) => GET(new Request(`http://localhost:3000/api/avisos/token?clientId=${clientId}`));

beforeEach(() => vi.mocked(obtenerUsuarioActual).mockResolvedValue(null));

describe("GET /api/avisos/token", () => {
  it("sin sesión responde 401", async () => {
    expect((await pedir("c1")).status).toBe(401);
  });

  it("con un clientId inválido responde 400", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: "u1", email: "a@b.cl", nombre: null, rol: "student" });
    expect((await pedir("no%20vale")).status).toBe(400);
  });

  it("firma un token de propósito usuario para esa persona", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: "u1", email: "a@b.cl", nombre: null, rol: "student" });
    const { token } = (await (await pedir("c1")).json()) as { token: string };
    expect(verificarTokenSocket({ token, clientId: "c1", proposito: PROPOSITO_USUARIO, secreto: "secreto-de-prueba" })).toEqual({ userId: "u1" });
  });
});
