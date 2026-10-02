import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, MISIONES, registrarse } from "./progreso";

const CLASES = "clases-de-sql";

test("la ruta muestra las clases antes del caso de SQL, sin entregable ni rúbrica", async ({ page }) => {
  await page.goto("/rutas/data-analyst");
  const clases = page.getByRole("link", { name: /Clases de SQL/ });
  await expect(clases).toContainText("18 lecciones");
  // Las clases no cuentan en la numeración: Minimarkets sigue siendo el tercer caso de la ruta.
  await expect(page.getByRole("link", { name: /Minimarkets del Sur/ })).toContainText("Caso 3 · Minimarkets del Sur");
  await page.goto(`/casos/${CLASES}`);
  await expect(page.getByText("> clases")).toBeVisible();
  await expect(page.getByText("Lección 1 · 12 min")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu avance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu entregable" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cómo se revisa tu entregable" })).toHaveCount(0);
});

test("con los casos 0 y 1 completos: resuelve una lección y, al aprobarlas todas, se habilita el Caso 2", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(180_000);
  const email = await registrarse(page, "Valentina Soto");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos"]) await completarCaso(page, admin, ip, email, caso);

  await page.goto(`/casos/${CLASES}/01-select-basico`);
  await expect(page.getByText("> lección 1/18 · 12 min")).toBeVisible();
  await expect(page.getByText("Sintaxis", { exact: true })).toBeVisible();
  const consulta = page.getByLabel("Consulta SQL");
  await consulta.fill("SELECT nombre FROM estudiantes");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("Tu consulta debe devolver 2 columnas", { exact: false })).toBeVisible();
  await consulta.fill("SELECT nombre, ciudad FROM estudiantes");
  const aprobada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();

  await page.goto("/casos/minimarkets-del-sur");
  await expect(page.getByText("sus tareas se habilitan al completar", { exact: false })).toContainText("Clases de SQL");
  await aprobar(page, ip, CLASES, MISIONES[CLASES].slice(1));
  await page.goto(`/casos/${CLASES}`);
  await expect(page.getByText("Clases completas", { exact: false })).toBeVisible();
  await page.goto("/casos/minimarkets-del-sur");
  await expect(page.getByText("sus tareas se habilitan al completar", { exact: false })).toHaveCount(0);
});

test("con el Caso 0 completo: las clases de Excel traen su propia planilla y una lectura se completa al marcarla", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(180_000);
  const email = await registrarse(page, "Martina Rojas");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");
  const excel = MISIONES["clases-de-excel"];
  await aprobar(page, ip, "clases-de-excel", excel.slice(0, 1));

  await page.goto("/casos/clases-de-excel/02-primera-formula");
  await expect(page.getByText("> lección 2/23", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Celda A2", exact: true })).toHaveText("Notebook");
  await expect(async () => {
    await page.getByRole("button", { name: "Celda D2", exact: true }).click();
    await page.getByLabel("Fórmula").fill("=B2*C2");
    await page.getByLabel("Fórmula").press("Enter");
    await expect(page.getByRole("button", { name: "Celda D2", exact: true })).toHaveText("1350000", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  const aprobada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();

  await aprobar(page, ip, "clases-de-excel", excel.slice(2, 21));
  await page.goto("/casos/clases-de-excel/22-excel-vs-base-de-datos");
  await expect(page.getByText("¿usarías Excel o una base de datos?", { exact: false })).toBeVisible();
  const marcada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Ver la respuesta y marcar como completada" }).click();
  await marcada;
  await expect(page.getByText("Una base de datos: el volumen y la edición simultánea", { exact: false })).toBeVisible();
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
});
