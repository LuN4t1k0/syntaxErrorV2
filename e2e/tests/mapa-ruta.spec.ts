import { expect, test } from "./fixtures";
import { completarCaso, entrarComoAdmin, registrarse } from "./progreso";

test("sin sesión, el mapa de la ruta muestra cada clase como una rama de su caso e invita a crear la cuenta", async ({ page }) => {
  await page.goto("/rutas/data-analyst");
  await expect(page.getByText("$ git log --graph --reverse data-analyst")).toBeVisible();
  const mapa = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" });
  await expect(mapa.getByRole("link", { name: /Herramientas del oficio/ })).toContainText("Initial commit");
  const sql = mapa.getByRole("link", { name: /Clases de SQL/ });
  await expect(sql).toContainText("clases/sql");
  await expect(sql).toContainText("18 lecciones");
  await expect(mapa.getByRole("link", { name: /Minimarkets del Sur/ })).toContainText("Merge branch 'clases/sql'");
  await expect(mapa.getByRole("link", { name: /Proyecto final/ })).toContainText("deploy");
  await expect(mapa.getByText("Certificado Data Analyst")).toBeVisible();
  await expect(page.getByRole("link", { name: "Crea tu cuenta" })).toHaveAttribute("href", "/registro?callbackUrl=%2Frutas%2Fdata-analyst");
  await expect(mapa.getByText("Bloqueado", { exact: true })).toHaveCount(0);
});

test("con el Caso 0 completo, el mapa marca lo hecho, dónde está tu HEAD y lo bloqueado, y cabe en un teléfono", async ({ page, ip, nuevaPagina }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const email = await registrarse(page, "Ignacia Paredes");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");

  await page.goto("/rutas/data-analyst");
  const mapa = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" });
  await expect(mapa.getByRole("link", { name: "Herramientas del oficio: GitHub y tu portafolio: completo" })).toContainText("Completado");
  const excel = mapa.getByRole("link", { name: /Clases de Excel.*: siguiente$/ });
  await expect(excel).toContainText("HEAD -> tú");
  await expect(excel).toContainText("0/23 lecciones");
  await expect(mapa.getByRole("link", { name: /Despachos Rápidos.*: bloqueado$/ })).toContainText("Bloqueado");
  await expect(page.getByRole("progressbar", { name: "Casos completados" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("link", { name: "Crea tu cuenta" })).toHaveCount(0);
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
