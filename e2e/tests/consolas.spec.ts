import { expect, reporteDeTarea, test, type Page } from "./fixtures";

const CASO = "/casos/demo-motor";
const MISION_SQL = `${CASO}/01-clientes-de-regiones`;
const MISION_HOJA = `${CASO}/02-total-de-ventas`;
const MISION_PYTHON = `${CASO}/03-ticket-promedio`;
const CONSULTA_CORRECTA = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';";

async function registrarse(page: Page) {
  const email = `consolas-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto(`/registro?callbackUrl=${encodeURIComponent("/dashboard")}`);
  await page.locator('input[name="name"]').fill("Camila Rojas");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function validarYEsperar(page: Page) {
  const reportado = reporteDeTarea(page);
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

// El editor de CodeMirror reemplaza al textarea después de cargar.
async function editorListo(page: Page, etiqueta: string) {
  await expect(page.locator(`.cm-content[aria-label="${etiqueta}"]`)).toBeVisible({ timeout: 30_000 });
}

test("SQL: colores, sugerencias del caso, glosario y errores explicados", async ({ page }) => {
  await page.goto(MISION_SQL);
  await editorListo(page, "Consulta SQL");
  const editor = page.getByLabel("Consulta SQL");

  await editor.fill("SELECT nombre FROM ");
  await expect(page.locator(".cm-content .tok-keyword", { hasText: "SELECT" })).toBeVisible();
  await editor.pressSequentially("cli");
  // Se hace clic: con "cli" también aparece cliente_id, y el orden entre ambas es de CodeMirror.
  await page.getByRole("option", { name: /clientes/ }).click();
  await expect(editor).toHaveText("SELECT nombre FROM clientes");

  await page.locator(".cm-content .tok-keyword", { hasText: "SELECT" }).hover();
  await expect(page.locator(".consola-glosario")).toContainText("SELECT elige las columnas");

  await editor.fill("SELECT nombre FROM cliente");
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("Línea 1: No existe una tabla llamada «cliente».")).toBeVisible();
  await expect(page.getByText("¿Quisiste decir «clientes»?")).toBeVisible();
  await expect(page.locator(".cm-linea-error")).toHaveCount(1);

  await editor.fill("SELECT nombre FROM clientes WHERE ciudad = Santiago");
  await expect(page.locator(".cm-linea-error")).toHaveCount(0);
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("«Santiago» parece un texto: escríbelo entre comillas simples, 'Santiago'.")).toBeVisible();
});

test("sin sesión, una misión bloqueada muestra el editor pero no deja escribir", async ({ page }) => {
  await page.goto(MISION_PYTHON);
  await editorListo(page, "Código Python");
  await expect(page.getByLabel("Código Python")).toHaveAttribute("contenteditable", "false");
  await expect(page.locator(".cm-content .tok-variableName").first()).toBeVisible();
});

test("planilla y Python: ayuda de funciones, error de celda, error de Python y tablas de pandas", async ({ page }) => {
  test.setTimeout(240_000);
  await registrarse(page);
  await page.goto(MISION_SQL);
  await editorListo(page, "Consulta SQL");
  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  await validarYEsperar(page);

  await page.goto(MISION_HOJA);
  await page.getByRole("button", { name: "Celda F2" }).click();
  const formula = page.getByLabel("Fórmula");
  await formula.fill("=su");
  await page.getByRole("list", { name: "Funciones sugeridas" }).getByRole("button", { name: "SUMA", exact: true }).click();
  await expect(formula).toHaveValue("=SUMA(");
  await expect(page.getByText("SUMA(número1; [número2]; …)")).toBeVisible();
  await formula.fill("=sumar(d2:d7)");
  await formula.press("Enter");
  await expect(page.getByText("F2: La planilla no conoce la función SUMAR.")).toBeVisible();
  await expect(page.getByText("¿Quisiste decir SUMA?")).toBeVisible();
  await formula.fill("=suma(d2:d7)");
  await formula.press("Enter");
  await expect(page.getByRole("button", { name: "Celda F2" })).toHaveText("1049000");
  await validarYEsperar(page);

  await page.goto(MISION_PYTHON);
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 150_000 });
  await page.getByRole("button", { name: "Probar ejemplo" }).click();
  await expect(page.locator("caption", { hasText: "ventas" })).toContainText("6 filas");

  await editorListo(page, "Código Python");
  const codigo = page.getByLabel("Código Python");
  await codigo.fill('ticket_promedio = round(venta["monto"].mean())');
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("Línea 1: No existe nada llamado «venta».")).toBeVisible();
  await expect(page.getByText("¿Quisiste decir «ventas»?")).toBeVisible();
  await expect(page.locator(".cm-linea-error")).toHaveCount(1);

  await codigo.fill('ticket_promedio = round(ventas["monto"].mean())');
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();
});
