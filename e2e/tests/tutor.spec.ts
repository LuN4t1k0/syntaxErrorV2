import { expect, reporteDeTarea, test } from "./fixtures";

const MISION_SQL = "/casos/demo-motor/01-clientes-de-regiones";

test("sin sesión, el tutor pide entrar", async ({ page }) => {
  await page.goto(MISION_SQL);
  await page.getByRole("button", { name: "Preguntar al tutor" }).click();
  await expect(page.getByRole("link", { name: "Entra para preguntarle al tutor" })).toBeVisible();
});

test("el tutor responde con el contexto de la misión y reutiliza la respuesta", async ({ page }) => {
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Ignacia Pérez");
  await page.locator('input[name="email"]').fill(`tutor-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto(MISION_SQL);
  await page.getByRole("button", { name: "Preguntar al tutor" }).click();
  await expect(page.getByText("Primero intenta resolver la tarea.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();
  for (let intento = 0; intento < 5; intento += 1) {
    const reportado = reporteDeTarea(page, false);
    await page.getByLabel("Consulta SQL").fill("SELECT nombre FROM clientes");
    await page.getByRole("button", { name: "Validar" }).click();
    await reportado;
  }
  await page.getByRole("button", { name: "Preguntar al tutor" }).click();
  const pregunta = "¿Cómo filtro los clientes que no son de Santiago?";
  await page.getByLabel("Tu pregunta").fill(pregunta);
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  await expect(page.getByText('Respuesta de prueba del tutor para la misión "Clientes de regiones"', { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  });

  await page.getByLabel("Tu pregunta").fill(pregunta);
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  await expect(page.getByText("Respondida desde respuestas anteriores de esta misión.")).toBeVisible();
});
