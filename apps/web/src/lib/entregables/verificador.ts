import { crearVerificadorGithub, verificadorPrueba, type Verificador } from "./github";

export function verificadorDesdeEntorno(): Verificador {
  if (process.env.ENTREGABLES_VERIFICACION === "prueba") return verificadorPrueba;
  return crearVerificadorGithub({ fetch: globalThis.fetch, token: process.env.GITHUB_TOKEN?.trim() || undefined });
}
