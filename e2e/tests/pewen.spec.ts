import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "tienda-online-pewen";

test("con los casos 0, 1 y 2 y sus clases completos: filtra con pandas, entiende el error de paréntesis y ve las tablas", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Florencia Huenchumilla");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python"]) await completarCaso(page, admin, ip, email, caso);

  await aprobar(page, ip, CASO, [
    ["01-de-la-planilla-a-python", "totales-del-carrito"],
    ["01-de-la-planilla-a-python", "primera-tabla"],
    ["02-cargar-y-explorar", "explorar-pedidos"],
  ]);

  await page.goto(`/casos/${CASO}/03-filtrar-y-seleccionar`);
  await expect(page.getByText("Python listo").first()).toBeVisible({ timeout: 150_000 });
  const codigo = page.getByLabel("Código Python");
  const ejecutar = page.getByRole("button", { name: "Ejecutar" });

  await codigo.nth(1).fill('grandes = pedidos[pedidos["cantidad"] >= 3 & pedidos["estado"] == "entregado"]');
  await ejecutar.nth(1).click();
  await expect(page.getByText("Combinaste condiciones con & o | sin paréntesis.", { exact: false })).toBeVisible();

  await codigo.nth(1).fill('grandes = pedidos.loc[(pedidos["cantidad"] >= 3) & (pedidos["estado"] == "entregado"), ["pedido_id", "cantidad"]]');
  await ejecutar.nth(1).click();
  await expect(page.locator("caption", { hasText: "grandes" })).toContainText("71 filas");

  await codigo.first().fill('devueltos = pedidos[pedidos["estado"] == "devuelto"]');
  const primera = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await primera;
  await page.getByRole("button", { name: "Validar" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Misión aprobada" })).toBeVisible();
});
