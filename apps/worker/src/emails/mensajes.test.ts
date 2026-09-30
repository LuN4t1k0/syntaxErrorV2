import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { describe, expect, it } from "vitest";
import { construirEmail } from "./mensajes";

const enlace = "https://syntaxerror.cl/verificar-email?token=abc";

const casos: Array<[TrabajoEmail, string]> = [
  [{ tipo: "verificar-email", para: "ana@correo.cl", nombre: "Ana", enlace }, "Confirma tu email"],
  [{ tipo: "confirmar-nuevo-email", para: "ana@correo.cl", nombre: "Ana", enlace }, "Confirma tu nuevo email"],
  [{ tipo: "aviso-cambio-email", para: "ana@correo.cl", nombre: "Ana", nuevoEmail: "nueva@correo.cl" }, "Pidieron cambiar el email de tu cuenta"],
  [{ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" }, "Tu contraseña fue actualizada"],
  [{ tipo: "recuperar-clave", para: "ana@correo.cl", nombre: "Ana", enlace }, "Restablece tu contraseña"],
  [{ tipo: "cuenta-eliminada", para: "ana@correo.cl", nombre: "Ana" }, "Tu cuenta fue eliminada"],
  [{ tipo: "certificado-emitido", para: "ana@correo.cl", nombre: "Ana", titulo: "Ventas de marzo", enlace }, "Obtuviste un certificado"],
];

describe("construirEmail", () => {
  it.each(casos)("%o tiene el asunto correcto y no usa voseo", (trabajo, asunto) => {
    const email = construirEmail(trabajo);
    expect(email.asunto).toBe(`syntaxError.cl — ${asunto}`);
    expect(email.texto).not.toMatch(/\bvos\b|fuiste vos/i);
  });

  it("los emails con enlace lo incluyen en HTML y texto", () => {
    for (const [trabajo] of casos) {
      if (!("enlace" in trabajo)) continue;
      const email = construirEmail(trabajo);
      expect(email.html).toContain(enlace);
      expect(email.texto).toContain(enlace);
    }
  });

  it("el aviso de cambio nombra el email nuevo", () => {
    expect(construirEmail(casos[2][0]).texto).toContain("nueva@correo.cl");
  });

  it("saluda por nombre o con un saludo neutro", () => {
    expect(construirEmail({ tipo: "clave-cambiada", para: "a@b.cl", nombre: "Ana" }).texto).toContain("Hola, Ana:");
    expect(construirEmail({ tipo: "clave-cambiada", para: "a@b.cl", nombre: null }).texto).toContain("Hola:");
  });
});
