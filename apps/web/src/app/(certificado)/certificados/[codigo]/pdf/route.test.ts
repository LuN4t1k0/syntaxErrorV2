import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { certificados, certificadosLegacy, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

const { GET } = await import("./route");
const { db, close } = createTestDb();

const descargar = (codigo: string, ip = crypto.randomUUID()) =>
  GET(new Request(`http://localhost:3000/certificados/${codigo}/pdf`, { headers: { "x-forwarded-for": ip } }), {
    params: Promise.resolve({ codigo }),
  });

beforeEach(async () => {
  await truncateAll(db);
  const [usuario] = await db.insert(users).values({ email: `ana-${crypto.randomUUID()}@correo.cl`, name: "Ana Rojas" }).returning({ id: users.id });
  await db.insert(certificados).values({
    userId: usuario.id,
    codigo: "NUEVO123456",
    tipo: "ruta",
    nombreAlumno: "Ana Rojas",
    titulo: "Data Analyst",
    cargo: "Analista de datos junior",
    emitidoEn: new Date("2026-10-04T15:00:00Z"),
  });
  await db.insert(certificadosLegacy).values({
    codigo: "LEGADO1234",
    nombreAlumno: "Ana Rojas",
    titulo: "SQL desde cero",
    tipo: "curso",
    emitidoEn: new Date("2026-01-15T12:00:00Z"),
  });
});
afterAll(() => close());

describe("GET /certificados/[codigo]/pdf", () => {
  it("descarga el PDF de un certificado nuevo con su código en el nombre", async () => {
    const respuesta = await descargar("NUEVO123456");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("application/pdf");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="certificado-NUEVO123456.pdf"');
    expect(Buffer.from(await respuesta.arrayBuffer()).toString("latin1").startsWith("%PDF-")).toBe(true);
  });

  it("descarga el PDF de un certificado legacy con su código en el nombre", async () => {
    const respuesta = await descargar("LEGADO1234");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("application/pdf");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="certificado-LEGADO1234.pdf"');
    expect(Buffer.from(await respuesta.arrayBuffer()).toString("latin1").startsWith("%PDF-")).toBe(true);
  });

  it("un código que no existe responde 404", async () => {
    expect((await descargar("NOEXISTE00")).status).toBe(404);
  });

  it("desde la descarga 31 en diez minutos, la misma IP recibe 429", async () => {
    const ip = crypto.randomUUID();
    for (let intento = 0; intento < 30; intento++) expect((await descargar("NOEXISTE00", ip)).status).toBe(404);
    const limitada = await descargar("LEGADO1234", ip);
    expect(limitada.status).toBe(429);
    expect(limitada.headers.get("content-type")).toContain("application/json");
    expect(Number(limitada.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
