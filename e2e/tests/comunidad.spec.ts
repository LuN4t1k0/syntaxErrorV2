import { expect, test, type Page } from "./fixtures";

const MISION_SQL = "/casos/demo-motor/01-clientes-de-regiones";
const CONSULTA_CORRECTA = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';";

async function registrarse(page: Page, nombre: string) {
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(`comunidad-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// El admin de desarrollo lo crea db-setup (SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD).
async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@local.test");
  await page.locator('input[name="password"]').fill("admin123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("una decisión acertada y una misión aprobada suman puntos en el panel", async ({ page }) => {
  await registrarse(page, "Camila Rojas");
  await page.goto(MISION_SQL);
  await page.getByRole("button", { name: /Le pregunto qué significa activo/ }).click();
  await expect(page.getByText("+5 puntos")).toBeVisible();

  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;

  await page.goto("/dashboard");
  await expect(page.getByText("15 puntos")).toBeVisible();
});

test("un reporte se envía con la página desde donde se abrió", async ({ page }) => {
  await registrarse(page, "Tomás Vera");
  await page.goto(MISION_SQL);
  await page.getByRole("link", { name: "Reportar un problema" }).click();
  await expect(page).toHaveURL(/\/reportar\?pagina=%2Fcasos%2Fdemo-motor%2F01-clientes-de-regiones/);
  await expect(page.getByText("Página: /casos/demo-motor/01-clientes-de-regiones")).toBeVisible();
  await page.getByLabel("Un error").check();
  await page.getByLabel("Descripción").fill("La tabla de clientes no se ve completa en el celular.");
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByText("Gracias. Lo vamos a revisar.")).toBeVisible();
});

test("una pregunta sin clase la responde administración y quien preguntó ve la respuesta", async ({ page, nuevaPagina }) => {
  await registrarse(page, "Ignacio Soto");
  await page.goto(MISION_SQL);
  await page.getByRole("button", { name: "Preguntar a un docente" }).click();
  const texto = `¿Puedo usar NOT IN para excluir Santiago? (${Date.now()})`;
  await page.getByLabel("Tu pregunta para el equipo docente").fill(texto);
  await page.getByRole("button", { name: "Enviar al docente" }).click();
  await expect(page.getByText("Tu pregunta quedó enviada.", { exact: false })).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor/preguntas");
  const tarjeta = admin.locator("li", { hasText: texto });
  await tarjeta.getByLabel("Tu respuesta").fill("Sí: WHERE ciudad NOT IN ('Santiago') también funciona.");
  await tarjeta.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(tarjeta.getByText("Respondida")).toBeVisible();

  await page.goto("/dashboard/preguntas");
  await expect(page.getByText("Sí: WHERE ciudad NOT IN ('Santiago') también funciona.")).toBeVisible();
});

test("una clase: el docente la crea, la estudiante se une con el código y queda aceptada", async ({ page, nuevaPagina }) => {
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor");
  const titulo = `Clase e2e ${Date.now()}`;
  await admin.getByLabel("Nombre de la clase").fill(titulo);
  await admin.getByRole("button", { name: "Crear clase" }).click();
  await expect(admin).toHaveURL(/\/profesor\/clases\//);
  const codigo = ((await admin.getByTestId("codigo-clase").textContent()) ?? "").trim();
  expect(codigo).toMatch(/^[A-Z2-9]{6}$/);

  await registrarse(page, "Martina Fuentes");
  await page.goto("/dashboard/clases");
  await page.getByLabel("Código de la clase").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Unirme" }).click();
  await expect(page.getByText("No encontramos una clase con ese código.")).toBeVisible();
  await page.getByLabel("Código de la clase").fill(codigo.toLowerCase());
  await page.getByRole("button", { name: "Unirme" }).click();
  await expect(page.getByText(`Tu solicitud para entrar a «${titulo}» quedó enviada.`, { exact: false })).toBeVisible();
  await expect(page.getByText("Por aceptar")).toBeVisible();

  await admin.reload();
  await admin.getByRole("button", { name: "Aceptar a Martina Fuentes" }).click();
  await expect(admin.getByRole("button", { name: "Retirar a Martina Fuentes" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Activa", { exact: true })).toBeVisible();
  // La clase muestra los casos de su ruta (la primera, Data Analyst), en orden: el primero es el Caso 0.
  await expect(page.locator('a[href="/casos/herramientas-del-oficio"]')).toBeVisible();
});
