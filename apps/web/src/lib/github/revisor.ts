import { parsearRepositorio } from "@/lib/entregables/github";
import { PATRON_USUARIO } from "./descripcion";
import { problemasRepositorio } from "./requisitos";

export type Objetivo = { dueno: string; nombre: string };
export type RevisionGithub = { aprobada: true } | { aprobada: false; problemas: string[]; reintentable: boolean };
export type RevisorGithub = (objetivo: Objetivo, requisitos: string[]) => Promise<RevisionGithub>;


const noDisponible = (): RevisionGithub => ({
  aprobada: false,
  problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."],
  reintentable: true,
});
const rechazo = (...problemas: string[]): RevisionGithub => ({ aprobada: false, problemas, reintentable: false });

// Resuelve qué repositorio revisar: la plantilla de la tarea ("{usuario}/mi-primer-repositorio") o el enlace pegado.
export function resolverObjetivo(plantilla: string | undefined, { usuario, url }: { usuario?: string; url?: string }): Objetivo | null {
  if (plantilla) {
    if (!usuario || !PATRON_USUARIO.test(usuario)) return null;
    const [dueno, nombre] = plantilla.replaceAll("{usuario}", usuario).split("/");
    return { dueno, nombre };
  }
  return url ? parsearRepositorio(url) : null;
}

export function crearRevisorGithub({ fetch, token, timeoutMs = 8_000 }: { fetch: typeof globalThis.fetch; token?: string; timeoutMs?: number }): RevisorGithub {
  const api = (ruta: string, accept = "application/vnd.github+json") =>
    fetch(`https://api.github.com${ruta}`, {
      headers: { Accept: accept, "User-Agent": "syntaxerror.cl", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });

  return async ({ dueno, nombre }, requisitos) => {
    try {
      const base = `/repos/${dueno}/${nombre}`;
      const repo = await api(base);
      // Sin token, GitHub responde 404 también para los privados.
      if (repo.status === 404) {
        return rechazo(`No encontramos github.com/${dueno}/${nombre}. Revisa que el nombre sea exacto y que el repositorio sea público.`);
      }
      if (!repo.ok) return noDisponible();
      const datos = (await repo.json()) as { private?: boolean; default_branch?: string };

      const arbol = await api(`${base}/git/trees/${encodeURIComponent(datos.default_branch ?? "main")}?recursive=1`);
      if (arbol.status === 404 || arbol.status === 409) return rechazo("El repositorio está vacío: crea al menos el README.");
      if (!arbol.ok) return noDisponible();
      const { tree = [] } = (await arbol.json()) as { tree?: { path: string; type: string }[] };
      const rutas = tree.filter((nodo) => nodo.type === "blob").map((nodo) => nodo.path);

      let readme: string | null = null;
      if (requisitos.some((requisito) => requisito.startsWith("readme:"))) {
        const respuesta = await api(`${base}/readme`, "application/vnd.github.raw");
        if (respuesta.ok) readme = await respuesta.text();
        else if (respuesta.status !== 404) return noDisponible();
      }

      let mensajes: string[] = [];
      if (requisitos.some((requisito) => requisito.startsWith("commits:"))) {
        const respuesta = await api(`${base}/commits?per_page=100`);
        if (!respuesta.ok) return noDisponible();
        mensajes = ((await respuesta.json()) as { commit: { message: string } }[]).map((commit) => commit.commit.message);
      }

      const problemas = problemasRepositorio({ publico: !datos.private, rutas, readme, mensajes }, requisitos);
      return problemas.length > 0 ? rechazo(...problemas) : { aprobada: true };
    } catch {
      return noDisponible();
    }
  };
}

// Para desarrollo y e2e (ENTREGABLES_VERIFICACION=prueba): no llama a GitHub.
export const revisorPrueba: RevisorGithub = async ({ dueno, nombre }) => {
  if (dueno === "no-existe") return rechazo(`No encontramos github.com/${dueno}/${nombre}. Revisa que el nombre sea exacto y que el repositorio sea público.`);
  if (nombre.includes("vacio")) return rechazo("El repositorio está vacío: crea al menos el README.");
  return { aprobada: true };
};

export function revisorDesdeEntorno(): RevisorGithub {
  if (process.env.ENTREGABLES_VERIFICACION === "prueba") return revisorPrueba;
  return crearRevisorGithub({ fetch: globalThis.fetch, token: process.env.GITHUB_TOKEN?.trim() || undefined });
}
