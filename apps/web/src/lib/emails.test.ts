import { describe, expect, it, vi } from "vitest";

vi.mock("@syntaxerror/queue/emails", () => ({
  crearColaEmails: () => ({
    encolar: vi.fn(async () => {
      throw new Error("La cola de emails no responde.");
    }),
    cerrar: vi.fn(),
  }),
}));

const { encolarEmail, encolarSinFallar } = await import("./emails");
const aviso = { tipo: "clave-cambiada" as const, para: "ana@correo.cl", nombre: "Ana" };

describe("emails desde la web", () => {
  it("encolarEmail propaga el error para que la ruta responda 503", async () => {
    await expect(encolarEmail(aviso)).rejects.toThrow("La cola de emails no responde.");
  });

  it("encolarSinFallar registra el error y deja seguir la acción del alumno", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(encolarSinFallar(aviso)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("[emails] no se pudo encolar clave-cambiada", expect.any(Error));
    error.mockRestore();
  });
});
