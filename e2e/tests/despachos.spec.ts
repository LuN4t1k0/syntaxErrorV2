import { expect, test, type Page } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, MISIONES, registrarse } from "./progreso";

const CASO = "/casos/despachos-rapidos";
const CASO_1 = MISIONES["despachos-rapidos"];

async function escribir(page: Page, celda: string, formula: string) {
  await page.getByRole("button", { name: `Celda ${celda}`, exact: true }).click();
  await page.getByLabel("Fórmula").fill(formula);
  await page.getByLabel("Fórmula").press("Enter");
}

async function validarYEsperar(page: Page) {
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

test("con el Caso 0 completo: busca en otra hoja, rellena hacia abajo y corrige la fórmula de la IA", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(240_000);
  const email = await registrarse(page, "Ignacia Soto");

  // El Caso 1 se habilita al completar el Caso 0, con su entregable aprobado.
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");

  await aprobar(page, ip, "despachos-rapidos", CASO_1.slice(0, 3));
  await page.goto(`${CASO}/04-buscar-en-otra-tabla`);
  await expect(page.getByRole("button", { name: "Celda B2", exact: true })).toHaveText(/^\d{2}\/03\/2025$/);

  await page.getByRole("tab", { name: "comunas", exact: true }).click();
  await expect(page.getByRole("table", { name: "Hoja comunas" })).toContainText("Valparaíso");
  await expect(page.getByLabel("Fórmula")).toBeDisabled();
  await page.getByRole("tab", { name: "despachos", exact: true }).click();

  await escribir(page, "I2", "=BUSCARV(D2;comunas!$A$2:$E$13;4;FALSO())");
  await expect(page.getByRole("button", { name: "Celda I2", exact: true })).toHaveText("3800");
  await page.getByRole("button", { name: "Rellenar hasta la fila 63" }).click();
  await expect(page.getByRole("button", { name: "Celda I63", exact: true })).toHaveText(/^\d+$/);
  await escribir(page, "J2", "=BUSCARX(D2;comunas!$A$2:$A$13;comunas!$E$2:$E$13)");
  await page.getByRole("button", { name: "Rellenar hasta la fila 63" }).click();
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await aprobar(page, ip, "despachos-rapidos", CASO_1.slice(4));
  await page.goto(`${CASO}/08-revisar-la-formula-de-la-ia`);
  await expect(page.getByRole("button", { name: "Celda I3", exact: true })).toHaveText("6200");
  await escribir(page, "I2", "=BUSCARV(D2;comunas!$A$2:$E$13;4;FALSO())");
  await page.getByRole("button", { name: "Rellenar hasta la fila 61" }).click();
  await expect(page.getByRole("button", { name: "Celda I3", exact: true })).toHaveText("3100");
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();
});
