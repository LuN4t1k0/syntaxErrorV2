import { expect, test, type Page } from "./fixtures";
import { entrarComoAdmin } from "./revision";

const CASO = "/casos/demo-motor";
const MISION_SQL = `${CASO}/01-clientes-de-regiones`;
const MISION_HOJA = `${CASO}/02-total-de-ventas`;

async function validarYEsperar(page: Page) {
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

test("una misión se lee pero no se resuelve hasta aprobar la anterior", async ({ page }) => {
  await page.goto(MISION_HOJA);
  await expect(page.getByText("Para resolver esta tarea, primero aprueba la misión", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar" })).toBeDisabled();
});

test("las pistas aparecen después de dos intentos fallidos", async ({ page }) => {
  await page.goto(MISION_SQL);
  await expect(page.getByRole("button", { name: "Ver pista" })).toHaveCount(0);
  await page.getByLabel("Consulta SQL").fill("SELECT nombre FROM clientes");
  await validarYEsperar(page);
  await expect(page.getByText("Llevas 1.", { exact: false })).toBeVisible();
  await validarYEsperar(page);
  await page.getByRole("button", { name: "Ver pista" }).click();
  await expect(page.getByText("Parte con SELECT nombre, ciudad FROM clientes.")).toBeVisible();
});

test("un repositorio sin README no pasa y una observación vuelve a quien entregó", async ({ page, ip, nuevaPagina }) => {
  const email = `recorrido-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Fernanda Lagos");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  for (const [mision, tarea] of [["01-clientes-de-regiones", "clientes-fuera-de-santiago"], ["02-total-de-ventas", "total-marzo"], ["03-ticket-promedio", "ticket-promedio"]]) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "demo-motor", mision, tarea, aprobada: true },
    });
    expect(respuesta.ok()).toBe(true);
  }

  await page.goto(CASO);
  const enlace = page.getByLabel("Enlace a tu repositorio de GitHub");
  await enlace.fill("https://github.com/fernanda/repo-vacio");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Falta el README en la carpeta principal del repositorio.")).toBeVisible();
  await enlace.fill("https://github.com/fernanda/demo-motor");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  await tarjeta.getByLabel("Comentario para la persona", { exact: false }).fill("Falta explicar tus conclusiones en el README.");
  await tarjeta.getByRole("button", { name: "Pedir cambios" }).click();
  await expect(tarjeta).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Tu docente pidió cambios:")).toBeVisible();
  await expect(page.getByText("Falta explicar tus conclusiones en el README.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar a revisión" })).toBeVisible();
});
