import { describe, expect, it } from "vitest";
import { plantillaSyntaxError } from "./plantilla";

const base = {
  asunto: "Confirma tu email",
  estado: { etiqueta: "INFO" as const, mensaje: "Cuenta creada" },
  saludo: "Hola, Ana:",
  parrafos: ["Primer párrafo.", "Segundo párrafo."],
  comandoCierre: 'git commit -m "primer día"',
};

describe("plantillaSyntaxError", () => {
  it("agrega la marca al asunto", () => {
    expect(plantillaSyntaxError(base).asunto).toBe("syntaxError.cl — Confirma tu email");
  });

  it("incluye el enlace como botón en HTML y como URL en el texto", () => {
    const email = plantillaSyntaxError({ ...base, enlace: { texto: "Confirmar mi email", url: "https://syntaxerror.cl/x?token=abc" } });
    expect(email.html).toContain('href="https://syntaxerror.cl/x?token=abc"');
    expect(email.html).toContain("Confirmar mi email");
    expect(email.texto).toContain("Confirmar mi email: https://syntaxerror.cl/x?token=abc");
  });

  it("escapa el HTML de los datos del alumno", () => {
    const email = plantillaSyntaxError({ ...base, saludo: "Hola, <script>alert(1)</script>:" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("la versión en texto no tiene etiquetas HTML", () => {
    const { texto } = plantillaSyntaxError(base);
    expect(texto).toContain("[INFO]: Cuenta creada");
    expect(texto).toContain("Segundo párrafo.");
    expect(texto).not.toMatch(/<[a-z]/i);
  });
});
