import { test as base } from "@playwright/test";

function ipAleatoria(): string {
  const octeto = () => Math.floor(Math.random() * 250) + 1;
  return `10.${octeto()}.${octeto()}.${octeto()}`;
}

export const test = base.extend<{ ip: string }>({
  ip: async ({}, use) => {
    await use(ipAleatoria());
  },
  context: async ({ context, ip }, use) => {
    await context.route("http://localhost:3000/**", (route) =>
      route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } })
    );
    await use(context);
  },
});

export { expect, type Page } from "@playwright/test";
