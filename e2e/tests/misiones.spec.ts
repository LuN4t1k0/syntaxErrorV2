import { expect, reporteDeTarea, test, type Page } from "./fixtures";
import { aprobarEntregable, entrarComoAdmin } from "./revision";

const CASO = "/casos/demo-motor";
const MISION_SQL = `${CASO}/01-clientes-de-regiones`;
const MISION_HOJA = `${CASO}/02-total-de-ventas`;
const MISION_PYTHON = `${CASO}/03-ticket-promedio`;
const CONSULTA_CORRECTA = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';";

async function registrarse(page: Page, callbackUrl: string): Promise<string> {
  const email = `misiones-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto(`/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.locator('input[name="name"]').fill("Valentina Muñoz");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  return email;
}

async function validarYEsperar(page: Page) {
  const reportado = reporteDeTarea(page);
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

test("sin sesión: aprueba la misión SQL y el progreso se sube al crear la cuenta", async ({ page }) => {
  await page.goto(MISION_SQL);
  await page.getByLabel("Consulta SQL").fill("SELECT nombre, ciudad FROM clientes");
  await validarYEsperar(page);
  await expect(page.getByText("Tu consulta trae 6 filas, se esperan 4.")).toBeVisible();
  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Misión aprobada" })).toBeVisible();
  const sincronizado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso/sync") && respuesta.ok());
  await registrarse(page, CASO);
  await expect(page).toHaveURL(new RegExp(`${CASO}$`));
  await sincronizado;
  await page.reload();
  await expect(page.getByTestId("estado-01-clientes-de-regiones")).toHaveText("Aprobada");
});

test("con sesión: aprueba las tres misiones y completa el caso con su entregable", async ({ page, nuevaPagina }) => {
  test.setTimeout(240_000);
  const email = await registrarse(page, "/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto(MISION_SQL);
  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  await validarYEsperar(page);
  await page.goto(MISION_HOJA);
  await page.getByRole("button", { name: "Celda F2" }).click();
  await page.getByLabel("Fórmula").fill("=suma(d2:d7)");
  await page.getByLabel("Fórmula").press("Enter");
  await expect(page.getByRole("button", { name: "Celda F2" })).toHaveText("1049000");
  await validarYEsperar(page);
  await page.goto(MISION_PYTHON);
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 150_000 });
  await page.getByLabel("Código Python").fill('ticket_promedio = round(ventas["monto"].mean())');
  await validarYEsperar(page);
  await page.goto(CASO);
  for (const mision of ["01-clientes-de-regiones", "02-total-de-ventas", "03-ticket-promedio"]) {
    await expect(page.getByTestId(`estado-${mision}`)).toHaveText("Aprobada");
  }
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/valentina/demo-motor");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await aprobarEntregable(admin, email);

  await page.reload();
  await expect(page.getByText("Caso completo", { exact: true })).toBeVisible();
  await page.getByLabel("5 estrellas").check();
  await page.getByLabel("Comentario (opcional)").fill("Muy práctico para aprender SQL.");
  await page.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(page.getByText("Gracias. Tu comentario se publicará cuando lo revisemos.")).toBeVisible();
});
