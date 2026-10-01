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
  [
    { tipo: "pregunta-profesor-nueva", para: "docente@correo.cl", nombre: "Rosa", alumno: "Ana", caso: "Ventas", mision: "Clientes", pregunta: "¿Uso WHERE?", enlace },
    "Tienes una pregunta nueva",
  ],
  [
    { tipo: "pregunta-profesor-respondida", para: "ana@correo.cl", nombre: "Ana", caso: "Ventas", mision: "Clientes", pregunta: "¿Uso WHERE?", respuesta: "Sí, con comillas.", enlace },
    "Respondieron tu pregunta",
  ],
  [{ tipo: "resena-nueva", para: "admin@correo.cl", nombre: "Admin", caso: "Ventas", estrellas: 4, comentario: "Muy claro" }, "Hay una reseña por moderar"],
  [
    { tipo: "reporte-nuevo", para: "admin@correo.cl", nombre: "Admin", tipoReporte: "error", descripcion: "No carga", pagina: "/casos/ventas", autor: "Ana" },
    "Reportaron un error",
  ],
  [
    { tipo: "reporte-nuevo", para: "admin@correo.cl", nombre: "Admin", tipoReporte: "sugerencia", descripcion: "Más casos", pagina: "/", autor: "Ana" },
    "Llegó una sugerencia",
  ],
  [{ tipo: "solicitud-docente-nueva", para: "admin@correo.cl", nombre: "Admin", solicitante: "Rosa (rosa@correo.cl)" }, "Pidieron acceso docente"],
  [{ tipo: "clase-solicitud", para: "docente@correo.cl", nombre: "Rosa", alumno: "Ana", clase: "3°A", enlace }, "Pidieron entrar a tu clase"],
  [{ tipo: "clase-decision", para: "ana@correo.cl", nombre: "Ana", clase: "3°A", aceptada: true, enlace }, "Te aceptaron en la clase"],
  [{ tipo: "clase-decision", para: "ana@correo.cl", nombre: "Ana", clase: "3°A", aceptada: false, enlace }, "Ya no estás en la clase"],
  [{ tipo: "mensaje-nuevo", para: "ana@correo.cl", nombre: "Ana", asunto: "Gracias por tu reporte", enlace }, "Tienes un mensaje nuevo"],
  [{ tipo: "entregable-por-revisar", para: "rosa@correo.cl", nombre: "Rosa", alumno: "Ana (ana@correo.cl)", caso: "Ventas", enlace }, "Hay un entregable por revisar"],
  [{ tipo: "entregable-observado", para: "ana@correo.cl", nombre: "Ana", caso: "Ventas", comentario: "Falta explicar las conclusiones.", enlace }, "Tu entregable necesita cambios"],
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

  it("la respuesta de una pregunta incluye la pregunta y la respuesta", () => {
    const email = construirEmail(casos[8][0]);
    expect(email.texto).toContain("¿Uso WHERE?");
    expect(email.texto).toContain("Sí, con comillas.");
  });

  it("el texto que escribe una persona se escapa en el HTML", () => {
    const email = construirEmail({
      tipo: "reporte-nuevo",
      para: "admin@correo.cl",
      nombre: null,
      tipoReporte: "error",
      descripcion: '<img src=x onerror="alert(1)">',
      pagina: "/",
      autor: "Ana",
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img");
  });
});
