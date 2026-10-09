import { expect, reporteDeTarea, test, type Page } from "./fixtures";
import { entrarComoAdmin } from "./revision";

const CASO = "/casos/demo-motor";
const MISION_SQL = `${CASO}/01-clientes-de-regiones`;
const MISION_HOJA = `${CASO}/02-total-de-ventas`;

async function validarYEsperar(page: Page) {
  const reportado = reporteDeTarea(page);
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

test("una misión se lee pero no se resuelve hasta aprobar la anterior", async ({ page }) => {
  await page.goto(MISION_HOJA);
  await expect(page.getByText("Para resolver esta tarea, primero aprueba la misión", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar" })).toBeDisabled();
});

test("las pistas aparecen después de dos resultados incorrectos; un error de código no cuenta", async ({ page }) => {
  await page.goto(MISION_SQL);
  await expect(page.getByRole("button", { name: "Ver pista" })).toHaveCount(0);
  await page.getByLabel("Consulta SQL").fill("SELEC nombre FROM clientes");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("«SELEC» no es una palabra de SQL.", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("los errores de código no cuentan). Llevas 0.", { exact: false })).toBeVisible();
  await page.getByLabel("Consulta SQL").fill("SELECT nombre FROM clientes");
  await validarYEsperar(page);
  await expect(page.getByText("Llevas 1.", { exact: false })).toBeVisible();
  await validarYEsperar(page);
  await page.getByRole("button", { name: "Ver pista" }).click();
  await expect(page.getByText("Parte con SELECT nombre, ciudad FROM clientes.")).toBeVisible();
});

test("un repositorio sin README no pasa, y con un 1 en la rúbrica la observación vuelve a quien entregó", async ({ page, ip, nuevaPagina }) => {
  const email = `recorrido-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Fernanda Lagos");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  for (const [mision, tarea] of [["01-clientes-de-regiones", "clientes-fuera-de-santiago"], ["02-total-de-ventas", "total-marzo"], ["03-ticket-promedio", "ticket-promedio"]]) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "demo-motor", mision, tarea, aprobada: true },
    });
    expect(respuesta.ok()).toBe(true);
  }

  await page.goto(CASO);
  await expect(page.getByRole("heading", { name: "Cómo se revisa tu entregable" })).toBeVisible();
  const enlace = page.getByLabel("Enlace a tu repositorio de GitHub");
  await enlace.fill("https://github.com/fernanda/repo-vacio");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Falta el README en la carpeta principal del repositorio.")).toBeVisible();
  await enlace.fill("https://github.com/fernanda/demo-motor");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  // La lista se pagina y la base de e2e acumula entregables: se busca el de esta persona.
  await admin.goto(`/profesor/entregables?q=${encodeURIComponent(email)}`);
  const tarjeta = admin.locator("li", { hasText: email });
  // Se reintenta por si los puntajes se marcan antes de que la página hidrate: React no los registraría.
  await expect(async () => {
    await tarjeta.getByRole("group", { name: "Claridad del README y la explicación" }).getByLabel("3 · Destacado").check();
    await tarjeta.getByRole("group", { name: "Ejecución técnica del análisis" }).getByLabel("2 · Aceptable").check();
    const coherencia = tarjeta.getByRole("group", { name: "Coherencia de las conclusiones" });
    await coherencia.getByLabel("1 · Insuficiente").check();
    await coherencia.getByLabel("Qué debe corregir (obligatorio)").fill("Falta explicar tus conclusiones en el README.");
    await expect(tarjeta.getByText("Resultado: se piden cambios.", { exact: false })).toBeVisible({ timeout: 3_000 });
    await tarjeta.getByRole("button", { name: "Enviar revisión" }).click({ timeout: 3_000 });
    await expect(tarjeta).toHaveCount(0, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });

  await page.reload();
  await expect(page.getByText("Tu docente pidió cambios:")).toBeVisible();
  await expect(page.getByText("Coherencia de las conclusiones: 1 · Insuficiente")).toBeVisible();
  await expect(page.getByText("Falta explicar tus conclusiones en el README.")).toBeVisible();
  await expect(page.getByText("Claridad del README y la explicación: 3 · Destacado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar a revisión" })).toBeVisible();
});
