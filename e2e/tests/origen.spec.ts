import { expect, test } from "./fixtures";

test("el mensaje del creador se abre desde el menú, como en la v1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "El origen" }).click();
  await expect(page).toHaveURL(/\/lun4t1k0$/);
  await expect(page.getByText("> sudo ./run_bio_LuN4t!k0.sh")).toBeVisible();
  await expect(page.getByText("esta plataforma es 100% gratuita")).toBeVisible();
  await expect(page.getByText("Un abrazo gigante y dale con todo... ¡Aprende!")).toBeVisible();
});

test("la carta de bienvenida se abre desde el pie de página y cabe en un teléfono", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Por qué existimos" }).click();
  await expect(page).toHaveURL(/\/nosotros$/);
  await expect(page.getByRole("heading", { name: "Syntax Error no es el fin" })).toBeVisible();
  await expect(page.getByText("Bienvenido al club.")).toBeVisible();
  await expect(page.getByText("Prepara tu café, ajusta tu setup y ejecuta tu primer comando.")).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
