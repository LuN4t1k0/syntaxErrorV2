import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "proyecto-final";

test("la muestra del proyecto final se descarga tal como la publicaría un portal", async ({ page }) => {
  await page.goto(`/casos/${CASO}`);
  await expect(page.getByRole("link", { name: "matricula_comunal.csv" })).toHaveAttribute("href", `/casos/${CASO}/datos/matricula_comunal.csv`);
  await expect(page.getByText("125 filas · separado por punto y coma", { exact: false })).toBeVisible();
  const respuesta = await page.request.get(`/casos/${CASO}/datos/matricula_comunal.csv`);
  expect(await respuesta.text()).toContain("2020;Maule;Talca;Municipal;14.918");
});

test("con los casos 0 a 4 completos: escribe la propuesta y lee un archivo público con sus trampas", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(420_000);
  const email = await registrarse(page, "Javiera Muñoz");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen", "clases-de-power-bi", "clinica-cordillera-central"]) {
    await completarCaso(page, admin, ip, email, caso);
  }

  await page.goto(`/casos/${CASO}/01-elegir-tus-datos`);
  await page.getByLabel("Tu README").fill(
    "# Calidad del aire en Temuco\n\n## Pregunta\n\n¿En qué meses se supera más la norma de MP2,5?\n\n1. ¿Cuántos días se supera?\n2. ¿En qué meses?\n3. ¿Cambió desde 2019?\n\n## Datos\n\nMediciones de [SINCA](https://datos.gob.cl).\n\n## Por qué importa\n\nAyuda a planificar alertas."
  );
  const propuesta = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await propuesta;
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await page.goto(`/casos/${CASO}/02-leer-un-archivo-publico`);
  await expect(page.getByText("Python listo").first()).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.cm-content[aria-label="Código Python"]').first()).toBeVisible({ timeout: 30_000 });
  // Leído como un CSV cualquiera, el archivo queda en una sola columna: el código corre, pero el resultado está mal.
  await page.getByRole("button", { name: "Validar" }).first().click();
  await expect(page.getByText("matricula no tiene las cinco columnas: revisa con qué carácter se separan en el archivo.")).toBeVisible();
  await page.getByLabel("Código Python").first().fill('matricula = pd.read_csv("datos/matricula_comunal.csv", sep=";", na_values="s/i")');
  await page.getByRole("button", { name: "Validar" }).first().click();
  await expect(page.getByText("Los miles no se leyeron bien", { exact: false })).toBeVisible();
  await page.getByLabel("Código Python").first().fill('matricula = pd.read_csv("datos/matricula_comunal.csv", sep=";", thousands=".", na_values="s/i")');
  const leida = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await leida;
  await expect(page.getByText("¡Tarea aprobada!").first()).toBeVisible();
  // La tarea siguiente ya se puede aprobar: el servidor registró la primera.
  await aprobar(page, ip, CASO, [["02-leer-un-archivo-publico", "separar-los-totales"]]);
});
