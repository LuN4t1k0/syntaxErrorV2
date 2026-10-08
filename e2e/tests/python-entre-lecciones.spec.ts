import { expect, reporteDeTarea, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, MISIONES, registrarse } from "./progreso";

const CLASES = "clases-de-python";

test("al pasar a la lección siguiente, Python no se vuelve a cargar y no queda nada de la anterior", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(240_000);
  const email = await registrarse(page, "Florencia Ríos");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur"]) {
    await completarCaso(page, admin, ip, email, caso);
  }
  await aprobar(page, ip, CLASES, MISIONES[CLASES].slice(0, 11));

  // El wasm de Pyodide pesa varios MB: se cuenta cuántas veces se pide.
  let cargas = 0;
  page.context().on("request", (pedido) => {
    if (pedido.url().endsWith("pyodide.asm.wasm")) cargas += 1;
  });

  await page.goto(`/casos/${CLASES}/12-funciones`);
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 150_000 });
  const codigo = page.getByLabel("Código Python");
  await codigo.fill("def calcular_total(precio, cantidad, descuento=0):\n    return precio * cantidad * (1 - descuento)\n\ntotal_notebooks = calcular_total(450000, 3, 0.1)\ntotal_mouse = calcular_total(12000, 2)\nhuella = 1");
  const aprobada = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;

  // Navegación sin recargar, con el enlace a la lección siguiente.
  await page.getByRole("navigation", { name: "Misiones cercanas" }).getByRole("link", { name: "pandas y las Series →" }).click();
  await expect(page).toHaveURL(new RegExp(`/casos/${CLASES}/13-series$`));
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 30_000 });
  await codigo.fill("print(huella)");
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("No existe nada llamado «huella»", { exact: false })).toBeVisible();

  // La 13 usa pandas, que la 12 no cargaba.
  await codigo.fill("notas = pd.Series([5, 3, 4, 2, 4, 5])\npromedio = notas.mean()\nmejor = notas.max()\nnotas_100 = notas * 20");
  const conPandas = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await conPandas;
  await expect(page.getByText("¡Lección aprobada!").or(page.getByRole("heading", { name: "Lección aprobada" })).first()).toBeVisible();
  expect(cargas).toBe(1);
});
