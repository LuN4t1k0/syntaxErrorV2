import { describe, expect, it } from "vitest";
import { crearVerificadorGithub, parsearRepositorio, urlRepositorio, verificadorPrueba } from "./github";

type Respuestas = Record<string, { status: number; cuerpo?: unknown } | Error>;

function fetchFalso(respuestas: Respuestas) {
  const pedidas: string[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    pedidas.push(url);
    expect(new Headers(init?.headers).get("User-Agent")).toBe("syntaxerror.cl");
    const respuesta = respuestas[url.replace("https://api.github.com", "")];
    if (!respuesta) return new Response("{}", { status: 404 });
    if (respuesta instanceof Error) throw respuesta;
    return new Response(JSON.stringify(respuesta.cuerpo ?? {}), { status: respuesta.status });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, pedidas };
}

const REPO = { dueno: "ana", nombre: "ventas" };
const arbol = (...rutas: string[]) => ({ tree: rutas.map((path) => ({ path, type: "blob" })) });
const repoPublico = { status: 200, cuerpo: { private: false, default_branch: "main" } };

describe("parsearRepositorio", () => {
  it("acepta el enlace del repositorio con variantes comunes", () => {
    for (const url of [
      "https://github.com/ana/ventas",
      "https://github.com/ana/ventas/",
      "https://github.com/ana/ventas.git",
      "https://www.github.com/ana/ventas",
      "https://github.com/ana/ventas/tree/main/sql",
      "  https://github.com/ana/ventas  ",
    ]) {
      expect(parsearRepositorio(url)).toEqual(REPO);
    }
    expect(urlRepositorio(REPO)).toBe("https://github.com/ana/ventas");
  });

  it("rechaza lo que no es un repositorio de GitHub", () => {
    for (const url of ["http://github.com/ana/ventas", "https://github.com/ana", "https://gitlab.com/ana/ventas", "github.com/ana/ventas", "https://github.com/-ana/ventas", "https://github.com/ana/..", "mi repo"]) {
      expect(parsearRepositorio(url)).toBeNull();
    }
  });
});

describe("crearVerificadorGithub", () => {
  it("aprueba un repositorio público con README y los archivos pedidos", async () => {
    const { fetch, pedidas } = fetchFalso({
      "/repos/ana/ventas": repoPublico,
      "/repos/ana/ventas/git/trees/main?recursive=1": { status: 200, cuerpo: arbol("README.md", "sql/consultas.SQL", "datos.csv") },
    });
    expect(await crearVerificadorGithub({ fetch })(REPO, { archivos: [".sql"] })).toEqual({ ok: true, archivos: 3 });
    expect(pedidas).toHaveLength(2);
  });

  it("explica en español qué falta", async () => {
    const { fetch } = fetchFalso({
      "/repos/ana/ventas": repoPublico,
      "/repos/ana/ventas/git/trees/main?recursive=1": { status: 200, cuerpo: arbol("docs/README.md", "analisis.py") },
    });
    expect(await crearVerificadorGithub({ fetch })(REPO, { archivos: [".sql", ".py"] })).toEqual({
      ok: false,
      problemas: ["Falta el README en la carpeta principal del repositorio.", "Falta al menos un archivo .sql con tu trabajo."],
      reintentable: false,
    });
  });

  it("repositorio inexistente, privado o vacío", async () => {
    expect(await crearVerificadorGithub(fetchFalso({}))(REPO, { archivos: [] })).toMatchObject({
      ok: false,
      problemas: ["No encontramos el repositorio. Revisa el enlace y que el repositorio sea público."],
    });
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": { status: 200, cuerpo: { private: true, default_branch: "main" } } }))(REPO, { archivos: [] })).toMatchObject({
      ok: false,
      problemas: ["El repositorio es privado: hazlo público para que podamos revisarlo."],
    });
    expect(
      await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": repoPublico, "/repos/ana/ventas/git/trees/main?recursive=1": { status: 409 } }))(REPO, { archivos: [] })
    ).toMatchObject({ ok: false, problemas: ["El repositorio está vacío: sube tus archivos."] });
  });

  it("si GitHub no responde o limita las consultas, no deja pasar y pide reintentar", async () => {
    const esperado = { ok: false, problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."], reintentable: true };
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": { status: 403 } }))(REPO, { archivos: [] })).toEqual(esperado);
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": { status: 500 } }))(REPO, { archivos: [] })).toEqual(esperado);
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": new Error("timeout") }))(REPO, { archivos: [] })).toEqual(esperado);
  });

  it("envía el token si existe", async () => {
    let autorizacion: string | null = null;
    const fetch = (async (_url: string, init?: RequestInit) => {
      autorizacion = new Headers(init?.headers).get("Authorization");
      return new Response("{}", { status: 404 });
    }) as unknown as typeof globalThis.fetch;
    await crearVerificadorGithub({ fetch, token: "secreto" })(REPO, { archivos: [] });
    expect(autorizacion).toBe("Bearer secreto");
  });
});

describe("verificadorPrueba", () => {
  it("acepta cualquier repositorio salvo los que dicen vacio", async () => {
    expect(await verificadorPrueba(REPO, { archivos: [".sql"] })).toEqual({ ok: true, archivos: 1 });
    expect(await verificadorPrueba({ dueno: "ana", nombre: "repo-vacio" }, { archivos: [] })).toMatchObject({ ok: false });
  });
});
