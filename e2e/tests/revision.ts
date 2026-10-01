import { expect, type Page } from "./fixtures";

// El admin de desarrollo lo crea db-setup (SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD).
export async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@local.test");
  await page.locator('input[name="password"]').fill("admin123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function aprobarEntregable(admin: Page, email: string) {
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  await expect(tarjeta).toHaveCount(1);
  // Si los criterios se marcan antes de que la página hidrate, React no los registra y el servidor responde
  // que falta la rúbrica completa. Se reintenta hasta que el entregable sale de la lista.
  await expect(async () => {
    for (const criterio of await tarjeta.getByRole("checkbox").all()) await criterio.check();
    await tarjeta.getByRole("button", { name: "Aprobar entregable" }).click();
    await expect(tarjeta).toHaveCount(0, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}
