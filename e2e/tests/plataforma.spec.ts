import { expect, reporteDeTarea, test } from "./fixtures";

test("el buscador encuentra una misión sin importar tildes ni mayúsculas", async ({ page }) => {
  await page.goto("/buscar?q=zzzqqq");
  await expect(page.getByText("No encontramos resultados para «zzzqqq».")).toBeVisible();
  await page.getByLabel("Busca rutas, casos, misiones o conceptos").fill("CLIENTES de REGIÓNES");
  await page.getByRole("link", { name: /Clientes de regiones/ }).click();
  await expect(page).toHaveURL(/\/casos\/demo-motor\/01-clientes-de-regiones$/);
});

test("el panel lleva a la siguiente misión pendiente", async ({ page }) => {
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Antonia Vidal");
  await page.locator('input[name="email"]').fill(`continuar-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: "Continuar misión" })).toHaveCount(0);

  await page.goto("/casos/demo-motor/01-clientes-de-regiones");
  await page.getByLabel("Consulta SQL").fill("SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';");
  const reportado = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;

  await page.goto("/dashboard");
  const continuar = page.getByRole("link", { name: "Continuar misión" });
  await expect(continuar).toHaveAttribute("href", "/casos/demo-motor/02-total-de-ventas");
});

test("robots y sitemap están publicados", async ({ page }) => {
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/casos/demo-motor/01-clientes-de-regiones");
});
