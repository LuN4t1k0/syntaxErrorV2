import { expect, test, type Page } from "./fixtures";
import { aprobarEntregable, entrarComoAdmin } from "./revision";

const CASO = "/casos/despachos-rapidos";
const CASO_0: [string, string][] = [
  ["01-tu-primer-repositorio", "primer-repositorio"],
  ["02-escribe-un-readme", "readme-de-proyecto"],
  ["03-archivos-y-commits", "commits-propios"],
  ["04-ordena-tu-proyecto", "proyecto-ordenado"],
  ["05-el-readme-de-tu-proyecto", "readme-del-proyecto"],
  ["06-tu-perfil-de-github", "perfil"],
  ["07-tu-presentacion", "presentacion"],
];
const CASO_1: [string, string][] = [
  ["01-conoce-la-planilla", "costo-con-iva"],
  ["02-totales-del-mes", "totales"],
  ["03-condiciones", "condiciones"],
  ["04-buscar-en-otra-tabla", "buscar-tarifas"],
  ["05-limpiar-los-datos", "marcar-problemas"],
  ["06-resumir-por-comuna", "resumen-por-comuna"],
  ["07-indicadores-de-entrega", "indicadores"],
];

async function registrarse(page: Page): Promise<string> {
  const email = `despachos-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill("Ignacia Soto");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

// Aprueba misiones por la API, en orden, como si se hubieran resuelto en la página.
async function aprobar(page: Page, ip: string, caso: string, misiones: [string, string][]) {
  for (const [mision, tarea] of misiones) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso, mision, tarea, aprobada: true },
    });
    expect(respuesta.ok(), `${caso}/${mision}`).toBe(true);
  }
}

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
  const email = await registrarse(page);

  // El Caso 1 se habilita al completar el Caso 0, con su entregable aprobado.
  await aprobar(page, ip, "herramientas-del-oficio", CASO_0);
  await page.goto("/casos/herramientas-del-oficio");
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/ignacia/presentacion");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await aprobarEntregable(admin, email);

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
