import { expect, test } from "./fixtures";
import { entrarComoAdmin, registrarse } from "./progreso";

// En los e2e se ven los borradores, así que el cierre de las rutas beta (solo probadores y admins) no corre aquí: lo
// prueban beta.test.ts y api/progreso/beta.test.ts como en producción. Aquí se prueba lo que se ve.
test("una ruta en beta avisa que está en beta y no se indexa", async ({ page }) => {
  await page.goto("/rutas/data-analyst");
  await expect(page.getByRole("status").filter({ hasText: "Esta ruta está en beta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entra con tu cuenta" })).toHaveAttribute("href", "/login?callbackUrl=%2Frutas%2Fdata-analyst");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("los admins encuentran las rutas en beta en su panel; un estudiante no", async ({ page, nuevaPagina }) => {
  await registrarse(page, "Rocío Fuentes");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Tus casos y clases" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rutas en beta" })).toHaveCount(0);

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/dashboard");
  const betas = admin.getByRole("region", { name: "Rutas en beta" });
  await betas.getByRole("link", { name: "Data Analyst" }).click();
  await expect(admin).toHaveURL(/\/rutas\/data-analyst$/);
  await expect(admin.getByRole("status").filter({ hasText: "Estás probando esta ruta antes que el resto" })).toBeVisible();
});
