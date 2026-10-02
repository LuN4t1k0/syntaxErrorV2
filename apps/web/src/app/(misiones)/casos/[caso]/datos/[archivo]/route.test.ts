import { describe, expect, it, vi } from "vitest";

vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
const { GET, generateStaticParams } = await import("./route");

const pedir = (caso: string, archivo: string) => GET(new Request(`http://localhost:3000/casos/${caso}/datos/${archivo}`), { params: Promise.resolve({ caso, archivo }) });

describe("GET /casos/[caso]/datos/[archivo]", () => {
  it("entrega el CSV del caso para descargar, en UTF-8", async () => {
    const respuesta = await pedir("despachos-rapidos", "comunas.csv");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(respuesta.headers.get("Content-Disposition")).toBe('attachment; filename="despachos-rapidos-comunas.csv"');
    const texto = await respuesta.text();
    expect(texto.split("\n")[0]).toBe("comuna,region,zona,tarifa,dias_compromiso");
    expect(texto).toContain("Ñuñoa");
  });

  it("responde 404 si el archivo o el caso no existen", async () => {
    expect((await pedir("despachos-rapidos", "secretos.csv")).status).toBe(404);
    expect((await pedir("no-existe", "comunas.csv")).status).toBe(404);
  });

  it("genera en el build una ruta por cada tabla de cada caso", async () => {
    const rutas = await generateStaticParams();
    expect(rutas).toContainEqual({ caso: "despachos-rapidos", archivo: "despachos_limpios.csv" });
    expect(rutas).toContainEqual({ caso: "minimarkets-del-sur", archivo: "ventas.csv" });
    expect(rutas.some((ruta) => ruta.caso === "herramientas-del-oficio")).toBe(false);
  });
});
