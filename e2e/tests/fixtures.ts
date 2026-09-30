import { test as base } from "@playwright/test";

// Cada corrida usa una IP distinta para no chocar con el rate limit de registro (5 por hora
// e IP) al repetir la suite. Sin proxy delante, Next toma el x-forwarded-for que manda el cliente.
// Solo se agrega a las requests de la app: en las del CDN de Pyodide forzaría un preflight CORS.
export const ipDeLaCorrida = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route("http://localhost:3000/**", (route) =>
      route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ipDeLaCorrida } })
    );
    await use(context);
  },
});

export { expect, type Page } from "@playwright/test";
