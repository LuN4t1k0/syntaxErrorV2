import { cerrarBienvenida, expect, type Page, test } from "./fixtures";

const CASO = "/casos/herramientas-del-oficio";
const MISIONES: [string, string][] = [
  ["01-tu-primer-repositorio", "primer-repositorio"],
  ["02-escribe-un-readme", "readme-de-proyecto"],
  ["03-archivos-y-commits", "commits-propios"],
  ["04-ordena-tu-proyecto", "proyecto-ordenado"],
  ["05-el-readme-de-tu-proyecto", "readme-del-proyecto"],
  ["06-tu-perfil-de-github", "perfil"],
  ["07-tu-presentacion", "presentacion"],
];
const README = "# Análisis de despachos\n\n## Datos\n\n- despachos.csv\n\n## Resultados\n\n| Comuna | Atrasos |\n| --- | --- |\n| Maipú | 12 |\n\nVer [resultados](resultados/resumen.md).";

async function registrarse(page: Page) {
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill("Tomás Herrera");
  await page.locator('input[name="email"]').fill(`herramientas-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await cerrarBienvenida(page);
}

// En e2e, ENTREGABLES_VERIFICACION=prueba: el usuario no-existe simula una cuenta inexistente.
test("sin sesión: revisa el primer repositorio en GitHub y escribe un README con vista previa", async ({ page }) => {
  await page.goto(`${CASO}/${MISIONES[0][0]}`);
  const usuario = page.getByLabel("Tu usuario de GitHub");
  await usuario.fill("no-existe");
  await expect(page.getByText("Revisaremos github.com/no-existe/mi-primer-repositorio")).toBeVisible();
  await page.getByRole("button", { name: "Revisar en GitHub" }).click();
  await expect(page.getByText("No encontramos github.com/no-existe/mi-primer-repositorio.", { exact: false })).toBeVisible();
  await usuario.fill("ana-prueba");
  await page.getByRole("button", { name: "Revisar en GitHub" }).click();
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await page.goto(`${CASO}/${MISIONES[1][0]}`);
  const editor = page.getByLabel("Tu README");
  await editor.fill("#Análisis de despachos");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("Después de los # va un espacio", { exact: false })).toBeVisible();
  await editor.fill(README);
  const vista = page.getByRole("region", { name: "Vista previa" });
  await expect(vista.getByRole("heading", { name: "Análisis de despachos" })).toBeVisible();
  await expect(vista.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  // El usuario de GitHub se recuerda entre misiones.
  await page.goto(`${CASO}/${MISIONES[2][0]}`);
  await expect(page.getByLabel("Tu usuario de GitHub")).toHaveValue("ana-prueba");
});

test("al enviar el entregable se informa el plazo de revisión", async ({ page, ip }) => {
  await registrarse(page);
  for (const [mision, tarea] of MISIONES) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "herramientas-del-oficio", mision, tarea, aprobada: true },
    });
    expect(respuesta.ok()).toBe(true);
  }
  await page.goto(CASO);
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/tomas/presentacion");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Te responderemos en un plazo de 5 días hábiles", { exact: false })).toBeVisible();
});
