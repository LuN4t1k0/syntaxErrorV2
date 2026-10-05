import { expect, test } from "./fixtures";

test("la portada muestra el carrusel de la v1 junto a su texto y se elige la lámina con los botones", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprende resolviendo casos reales");
  const carrusel = page.getByRole("region", { name: "Así se aprende en syntaxError.cl" });
  // Con "reducir movimiento" no hay escritura animada: la maqueta aparece completa.
  await expect(carrusel.getByText("Caso 0 · git y GitHub")).toBeVisible();
  await expect(carrusel.getByText("git push -u origin main")).toBeVisible();
  await expect(carrusel.getByRole("button", { name: "Ver: Caso 0 · git y GitHub" })).toHaveAttribute("aria-pressed", "true");

  await carrusel.getByRole("button", { name: "Ver: SQL · Minimarkets del Sur" }).click();
  await expect(carrusel.getByText("Ventas por ciudad")).toBeVisible();
  await expect(carrusel.getByText("✔ ¡Tarea aprobada!")).toBeVisible();

  await carrusel.getByRole("button", { name: "Ver: IA para datos" }).click();
  await expect(carrusel.getByText("¿Dice de dónde salen los datos?")).toBeVisible();
  await expect(carrusel.getByText("Pide la fuente.")).toBeVisible();
  // Con "reducir movimiento" tampoco rota sola.
  await page.waitForTimeout(7_500);
  await expect(carrusel.getByText("Pide la fuente.")).toBeVisible();

  await carrusel.getByRole("link", { name: "Ver la ruta Data Analyst →" }).click();
  await expect(page).toHaveURL(/\/rutas\/data-analyst$/);
});

test("en un teléfono, el carrusel va bajo el texto y no desborda la página", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const titulo = await page.getByRole("heading", { level: 1 }).boundingBox();
  const carrusel = await page.getByRole("region", { name: "Así se aprende en syntaxError.cl" }).boundingBox();
  expect(carrusel!.y).toBeGreaterThan(titulo!.y + titulo!.height);
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
