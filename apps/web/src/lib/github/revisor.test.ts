import { describe, expect, it } from "vitest";
import { crearRevisorGithub, resolverObjetivo, revisorPrueba } from "./revisor";

type Respuesta = { status: number; cuerpo?: unknown; texto?: string } | Error;

function fetchFalso(respuestas: Record<string, Respuesta>) {
  const pedidas: string[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    const ruta = url.replace("https://api.github.com", "");
    pedidas.push(ruta);
    expect(new Headers(init?.headers).get("User-Agent")).toBe("syntaxerror.cl");
    const respuesta = respuestas[ruta];
    if (!respuesta) return new Response("{}", { status: 404 });
    if (respuesta instanceof Error) throw respuesta;
    return new Response(respuesta.texto ?? JSON.stringify(respuesta.cuerpo ?? {}), { status: respuesta.status });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, pedidas };
}

const OBJETIVO = { dueno: "ana", nombre: "ana" };
const repo = { status: 200, cuerpo: { private: false, default_branch: "main" } };
const arbol = (...rutas: string[]) => ({ status: 200, cuerpo: { tree: rutas.map((path) => ({ path, type: "blob" })) } });

describe("resolverObjetivo", () => {
  it("completa la plantilla con el usuario", () => {
    expect(resolverObjetivo("{usuario}/{usuario}", { usuario: "ana-perez" })).toEqual({ dueno: "ana-perez", nombre: "ana-perez" });
    expect(resolverObjetivo("{usuario}/mi-primer-repositorio", { usuario: "ana" })).toEqual({ dueno: "ana", nombre: "mi-primer-repositorio" });
  });

  it("rechaza usuarios inválidos y, sin plantilla, usa el enlace", () => {
    expect(resolverObjetivo("{usuario}/x", { usuario: "-ana" })).toBeNull();
    expect(resolverObjetivo("{usuario}/x", { usuario: "ana/../otro" })).toBeNull();
    expect(resolverObjetivo("{usuario}/x", {})).toBeNull();
    expect(resolverObjetivo(undefined, { url: "https://github.com/ana/presentacion" })).toEqual({ dueno: "ana", nombre: "presentacion" });
    expect(resolverObjetivo(undefined, { url: "ana/presentacion" })).toBeNull();
  });
});

describe("crearRevisorGithub", () => {
  it("lee el README y los commits solo si los requisitos los piden", async () => {
    const { fetch, pedidas } = fetchFalso({ "/repos/ana/ana": repo, "/repos/ana/ana/git/trees/main?recursive=1": arbol("README.md") });
    expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["publico", "readme"])).toEqual({ aprobada: true });
    expect(pedidas).toEqual(["/repos/ana/ana", "/repos/ana/ana/git/trees/main?recursive=1"]);
  });

  it("revisa el Markdown del README y los mensajes de los commits", async () => {
    const { fetch } = fetchFalso({
      "/repos/ana/ana": repo,
      "/repos/ana/ana/git/trees/main?recursive=1": arbol("README.md"),
      "/repos/ana/ana/readme": { status: 200, texto: "# Ana\n\n[GitHub](https://github.com/ana)" },
      "/repos/ana/ana/commits?per_page=100": { status: 200, cuerpo: [{ commit: { message: "Escribe mi presentación" } }, { commit: { message: "Create README.md" } }] },
    });
    expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["readme:titulo", "readme:enlace", "commits:1"])).toEqual({ aprobada: true });
    const resultado = await crearRevisorGithub({ fetch })(OBJETIVO, ["readme:lista", "commits:2"]);
    expect(resultado).toMatchObject({ aprobada: false, reintentable: false });
    expect(resultado.aprobada === false && resultado.problemas).toHaveLength(2);
  });

  it("explica el repositorio que no existe o está vacío", async () => {
    expect(await crearRevisorGithub({ fetch: fetchFalso({}).fetch })(OBJETIVO, ["readme"])).toEqual({
      aprobada: false,
      problemas: ["No encontramos github.com/ana/ana. Revisa que el nombre sea exacto y que el repositorio sea público."],
      reintentable: false,
    });
    const { fetch } = fetchFalso({ "/repos/ana/ana": repo, "/repos/ana/ana/git/trees/main?recursive=1": { status: 409 } });
    expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["readme"])).toMatchObject({ aprobada: false, problemas: ["El repositorio está vacío: crea al menos el README."] });
  });

  it("si GitHub falla o limita, pide reintentar sin culpar a la persona", async () => {
    for (const respuesta of [new Error("timeout"), { status: 403 }, { status: 500 }] as Respuesta[]) {
      const { fetch } = fetchFalso({ "/repos/ana/ana": respuesta });
      expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["readme"])).toEqual({
        aprobada: false,
        problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."],
        reintentable: true,
      });
    }
  });

  it("envía el token si lo hay", async () => {
    let autorizacion: string | null = null;
    const fetch = (async (_url: string, init?: RequestInit) => {
      autorizacion = new Headers(init?.headers).get("Authorization");
      return new Response("{}", { status: 404 });
    }) as unknown as typeof globalThis.fetch;
    await crearRevisorGithub({ fetch, token: "t0k3n" })(OBJETIVO, ["readme"]);
    expect(autorizacion).toBe("Bearer t0k3n");
  });
});

describe("revisorPrueba", () => {
  it("simula usuario inexistente y repositorio vacío", async () => {
    expect(await revisorPrueba({ dueno: "ana", nombre: "ana" }, ["readme"])).toEqual({ aprobada: true });
    expect(await revisorPrueba({ dueno: "no-existe", nombre: "x" }, ["readme"])).toMatchObject({ aprobada: false });
    expect(await revisorPrueba({ dueno: "ana", nombre: "repo-vacio" }, ["readme"])).toMatchObject({ aprobada: false });
  });
});
