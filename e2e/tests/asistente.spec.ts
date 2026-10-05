import { expect, test } from "./fixtures";
import { registrarse } from "./progreso";

const MISION_SQL = "/casos/demo-motor/01-clientes-de-regiones";

test("sin sesión, el asistente del curso pide entrar y vuelve a la misma página", async ({ page }) => {
  await page.goto("/casos/demo-motor");
  await page.getByRole("button", { name: "Asistente del curso" }).click();
  const panel = page.getByRole("region", { name: "Asistente del curso" });
  await expect(panel.getByRole("link", { name: "Entra para preguntarle al asistente" })).toHaveAttribute("href", "/login?callbackUrl=%2Fcasos%2Fdemo-motor");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("el asistente responde dudas de conceptos aunque el tutor de la misión siga bloqueado, y cabe en un teléfono", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await registrarse(page, "Matilde Soto");
  await page.goto(MISION_SQL);
  await page.getByRole("button", { name: "Asistente del curso" }).click();
  const panel = page.getByRole("region", { name: "Asistente del curso" });
  await expect(panel.getByText("No resuelvo las tareas", { exact: false })).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);

  const tema = crypto.randomUUID();
  const campo = panel.getByLabel("Tu pregunta al asistente");
  await campo.fill(`¿Qué es un ${tema}?`);
  await panel.getByRole("button", { name: "Enviar pregunta al asistente" }).click();
  await expect(panel.getByText(`Respuesta de prueba del asistente para el caso "Demo del motor: ventas de marzo": ¿Qué es un ${tema}?`)).toBeVisible({ timeout: 30_000 });
  await expect(campo).toHaveValue("");

  await campo.fill(`¿qué es un ${tema}?`);
  await panel.getByRole("button", { name: "Enviar pregunta al asistente" }).click();
  await expect(panel.getByText("Respondida desde respuestas anteriores de este curso.")).toBeVisible();

  await panel.getByRole("button", { name: "Cerrar el asistente" }).click();
  await page.getByRole("button", { name: "Preguntar al tutor" }).click();
  await expect(page.getByText("Primero intenta resolver la tarea.", { exact: false })).toBeVisible();
});
