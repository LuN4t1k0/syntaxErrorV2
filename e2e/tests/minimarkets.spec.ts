import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "minimarkets-del-sur";

test("con los casos 0 y 1 y las clases de SQL completos: cruza tablas con un error explicado y el top 10 con desempate", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(240_000);
  const email = await registrarse(page, "Benjamín Vera");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");
  await completarCaso(page, admin, ip, email, "despachos-rapidos");
  await completarCaso(page, admin, ip, email, "clases-de-sql");

  await aprobar(page, ip, CASO, [
    ["01-conoce-las-tablas", "locales-y-ciudades"],
    ["01-conoce-las-tablas", "categorias"],
    ["02-filtrar", "lacteos-caros"],
    ["02-filtrar", "productos-de-queso"],
    ["02-filtrar", "locales-del-sur"],
    ["03-ordenar-y-limitar", "productos-mas-caros"],
    ["03-ordenar-y-limitar", "ventas-mas-grandes"],
    ["04-resumir-con-group-by", "ventas-por-local"],
    ["04-resumir-con-group-by", "ventas-por-medio-de-pago"],
    ["05-filtrar-grupos", "productos-populares"],
    ["05-filtrar-grupos", "locales-con-ticket-alto"],
  ]);

  await page.goto(`/casos/${CASO}/06-cruzar-tablas`);
  await expect(page.getByText("ventas: id, fecha, local_id, producto_id, cantidad, monto, medio_pago").first()).toBeVisible();
  const consultas = page.getByLabel("Consulta SQL");
  await consultas.first().fill("SELECT l.ciudad, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON venta.local_id = l.id GROUP BY l.ciudad");
  await page.getByRole("button", { name: "Ejecutar" }).first().click();
  await expect(page.getByText("«venta» no es una tabla ni un alias de esta consulta.")).toBeVisible();

  await consultas.first().fill("SELECT l.ciudad, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON v.local_id = l.id GROUP BY l.ciudad");
  const primera = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await primera;

  await consultas.nth(1).fill("SELECT p.nombre, SUM(v.cantidad) AS unidades FROM ventas v JOIN productos p ON v.producto_id = p.id GROUP BY p.nombre ORDER BY unidades DESC LIMIT 10");
  await page.getByRole("button", { name: "Validar" }).nth(1).click();
  await expect(page.getByText("Si hay valores empatados en tu ORDER BY, agrega otra columna para desempatar", { exact: false })).toBeVisible();
  await consultas.nth(1).fill("SELECT p.nombre, SUM(v.cantidad) AS unidades FROM ventas v JOIN productos p ON v.producto_id = p.id GROUP BY p.nombre ORDER BY unidades DESC, p.nombre LIMIT 10");
  await page.getByRole("button", { name: "Validar" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Misión aprobada" })).toBeVisible();
});
