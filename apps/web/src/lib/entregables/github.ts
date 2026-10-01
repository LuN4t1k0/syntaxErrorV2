export type Repositorio = { dueno: string; nombre: string };
export type ResultadoVerificacion = { ok: true; archivos: number } | { ok: false; problemas: string[]; reintentable: boolean };
export type Verificador = (repo: Repositorio, requisitos: { archivos: string[] }) => Promise<ResultadoVerificacion>;

// Dueño con las reglas de GitHub (alfanumérico y guiones, sin empezar con guion, hasta 39). Se aceptan
// .git, la barra final y rutas internas (por ejemplo /tree/main), que se ignoran.
const PATRON = /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})(?:\/.*)?$/;

export function parsearRepositorio(url: string): Repositorio | null {
  const coincidencia = PATRON.exec(url.trim());
  if (!coincidencia) return null;
  const nombre = coincidencia[2].replace(/\.git$/, "");
  if (!nombre || nombre === "." || nombre === "..") return null;
  return { dueno: coincidencia[1], nombre };
}

export function urlRepositorio({ dueno, nombre }: Repositorio): string {
  return `https://github.com/${dueno}/${nombre}`;
}

const noDisponible = (): ResultadoVerificacion => ({
  ok: false,
  problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."],
  reintentable: true,
});
const rechazo = (...problemas: string[]): ResultadoVerificacion => ({ ok: false, problemas, reintentable: false });

export function crearVerificadorGithub({ fetch, token, timeoutMs = 8_000 }: { fetch: typeof globalThis.fetch; token?: string; timeoutMs?: number }): Verificador {
  const api = (ruta: string) =>
    fetch(`https://api.github.com${ruta}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "syntaxerror.cl", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });

  return async ({ dueno, nombre }, { archivos }) => {
    try {
      const repo = await api(`/repos/${dueno}/${nombre}`);
      // Sin token, GitHub responde 404 también para los privados.
      if (repo.status === 404) return rechazo("No encontramos el repositorio. Revisa el enlace y que el repositorio sea público.");
      if (!repo.ok) return noDisponible();
      const datos = (await repo.json()) as { private?: boolean; default_branch?: string };
      if (datos.private) return rechazo("El repositorio es privado: hazlo público para que podamos revisarlo.");

      const arbol = await api(`/repos/${dueno}/${nombre}/git/trees/${encodeURIComponent(datos.default_branch ?? "main")}?recursive=1`);
      if (arbol.status === 404 || arbol.status === 409) return rechazo("El repositorio está vacío: sube tus archivos.");
      if (!arbol.ok) return noDisponible();
      const { tree = [] } = (await arbol.json()) as { tree?: { path: string; type: string }[] };
      const rutas = tree.filter((nodo) => nodo.type === "blob").map((nodo) => nodo.path);

      const problemas: string[] = [];
      if (!rutas.some((ruta) => /^readme(\.[a-z0-9]+)?$/i.test(ruta))) problemas.push("Falta el README en la carpeta principal del repositorio.");
      for (const extension of archivos) {
        if (!rutas.some((ruta) => ruta.toLowerCase().endsWith(extension))) problemas.push(`Falta al menos un archivo ${extension} con tu trabajo.`);
      }
      return problemas.length > 0 ? rechazo(...problemas) : { ok: true, archivos: rutas.length };
    } catch {
      return noDisponible();
    }
  };
}

// Para desarrollo y e2e (ENTREGABLES_VERIFICACION=prueba): no llama a GitHub.
export const verificadorPrueba: Verificador = async ({ nombre }) =>
  nombre.includes("vacio") ? rechazo("Falta el README en la carpeta principal del repositorio.") : { ok: true, archivos: 1 };
