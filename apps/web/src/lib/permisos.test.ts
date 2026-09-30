import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { exigirAdmin, exigirDocente, exigirUsuario } = await import("./permisos");
const { esUuid } = await import("./uuid");

const persona = (rol: "student" | "teacher" | "admin") => ({ id: "u1", email: "a@b.cl", nombre: null, rol });

describe("permisos", () => {
  it("sin sesión responde 401", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
    expect((await exigirUsuario()).error?.status).toBe(401);
    expect((await exigirDocente()).error?.status).toBe(401);
  });

  it("una cuenta estudiante no es docente: 403", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(persona("student"));
    expect((await exigirUsuario()).usuario?.rol).toBe("student");
    expect((await exigirDocente()).error?.status).toBe(403);
  });

  it("teacher y admin pasan como docentes", async () => {
    for (const rol of ["teacher", "admin"] as const) {
      vi.mocked(obtenerUsuarioActual).mockResolvedValue(persona(rol));
      expect((await exigirDocente()).usuario?.rol).toBe(rol);
    }
  });

  it("esUuid distingue un uuid de cualquier otro texto", () => {
    expect(esUuid("0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11")).toBe(true);
    expect(esUuid("abc")).toBe(false);
    expect(esUuid("0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11' or 1=1")).toBe(false);
  });
  it("exigirAdmin solo deja pasar a administración", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
    expect((await exigirAdmin()).error?.status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(persona("teacher"));
    expect((await exigirAdmin()).error?.status).toBe(403);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(persona("admin"));
    expect((await exigirAdmin()).usuario?.rol).toBe("admin");
  });
});
