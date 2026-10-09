import { expect, test } from "./fixtures";

test("Ctrl+K abre la búsqueda en cualquier página y Enter lleva al primer resultado", async ({ page }) => {
  await page.goto("/rutas");
  const ventana = page.getByRole("dialog", { name: "Buscar en syntaxError.cl" });
  const consulta = ventana.getByLabel("Busca rutas, casos, misiones o lecciones");
  // El atajo funciona una vez que la página se activó en el navegador: se reintenta hasta entonces.
  await expect(async () => {
    await page.keyboard.press("Control+k");
    await expect(consulta).toBeFocused({ timeout: 1_000 });
  }).toPass();
  await consulta.fill("zzzqqq");
  await expect(ventana.getByText("No encontramos resultados para «zzzqqq».")).toBeVisible();
  await consulta.fill("CLIENTES de REGIÓNES");
  await expect(ventana.getByRole("link", { name: /Clientes de regiones/ })).toContainText("Misión · ");
  await consulta.press("Enter");
  await expect(page).toHaveURL(/\/casos\/demo-motor\/01-clientes-de-regiones$/);
  await expect(ventana).toBeHidden();

  // También dentro de una misión, con el encabezado de las misiones.
  await expect(async () => {
    await page.keyboard.press("Control+k");
    await expect(consulta).toBeFocused({ timeout: 1_000 });
  }).toPass();
  await consulta.fill("join");
  await expect(ventana.getByRole("link", { name: /Lección · Clases de SQL/ }).first()).toBeVisible();
});

test("el botón Buscar abre la ventana, marca las lecciones y lleva a todos los resultados", async ({ page }) => {
  // La landing tiene su propio encabezado, sin búsqueda: el botón Buscar está en el encabezado del resto del sitio.
  await page.goto("/rutas");
  await page.getByRole("banner").getByRole("link", { name: "Buscar" }).click();
  const ventana = page.getByRole("dialog", { name: "Buscar en syntaxError.cl" });
  await ventana.getByLabel("Busca rutas, casos, misiones o lecciones").fill("inner join");
  await expect(ventana.getByRole("link", { name: /Lección · Clases de SQL/ }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await expect(ventana.getByLabel("Busca rutas, casos, misiones o lecciones")).toBeFocused();
  await ventana.getByLabel("Busca rutas, casos, misiones o lecciones").fill("inner join");
  await ventana.getByRole("link", { name: "Ver todos los resultados" }).click();
  await expect(page).toHaveURL(/\/buscar\?q=inner%20join$/);
  await expect(page.getByRole("list", { name: "Resultados" }).getByText("Lección · Clases de SQL").first()).toBeVisible();
});

test("Escape cierra la ventana de búsqueda", async ({ page }) => {
  // La landing tiene su propio encabezado, sin búsqueda: el botón Buscar está en el encabezado del resto del sitio.
  await page.goto("/rutas");
  await page.getByRole("banner").getByRole("link", { name: "Buscar" }).click();
  const ventana = page.getByRole("dialog", { name: "Buscar en syntaxError.cl" });
  await expect(ventana).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ventana).toBeHidden();
});
