import { expect, test, type Page } from "./fixtures";
import { entrarComoAdmin } from "./progreso";

async function registrarseSinCerrar(page: Page, nombre: string) {
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(`bienvenida-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("dialog", { name: "Bienvenida a syntaxError.cl" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "¿Cómo funciona?" })).toHaveCount(0);
}

test("una estudiante nueva activa su ruta desde el panel y empieza la primera lección sin consola", async ({ page }) => {
  await registrarseSinCerrar(page, "Florencia Huenchumil");
  // Sin ruta, el panel muestra las rutas que puedes activar en el mismo formato que las activas.
  const rutas = page.getByRole("region", { name: "Tus rutas" });
  await expect(rutas.getByRole("heading", { name: "Activa tu ruta de aprendizaje" })).toBeVisible();
  await rutas.getByRole("button", { name: "Activar la ruta Data Analyst" }).click();
  await expect(rutas.getByRole("heading", { name: "Tus rutas de aprendizaje activas" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Hola, Florencia Huenchumil" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Bienvenida a syntaxError.cl" })).toHaveCount(0);
  const continuar = page.getByRole("region", { name: "Continuar" });
  await expect(continuar).toContainText("Tu ruta: Data Analyst");
  await expect(continuar).toContainText("Empieza por Herramientas del oficio");
  await expect(continuar.getByRole("link", { name: "Empezar" })).toHaveAttribute("href", "/casos/herramientas-del-oficio/01-tu-primer-repositorio");
  await expect(continuar.getByRole("link", { name: "Mapa de ruta" })).toHaveAttribute("href", "/rutas/data-analyst");
  await expect(page.getByRole("region", { name: "Tus rutas" })).toContainText("En curso");
  await continuar.getByRole("link", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/casos\/herramientas-del-oficio\/01-tu-primer-repositorio$/);
  await expect(page.getByRole("heading", { name: /Tu primer repositorio/ })).toBeVisible();
  await page.goto("/dashboard");
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Bienvenida a syntaxError.cl" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Continuar" })).toContainText("Data Analyst");
});

test("en el teléfono: el panel muestra rutas disponibles y futuras sin bloquear con una consola", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registrarseSinCerrar(page, "Ignacio Catrileo");
  const rutas = page.getByRole("region", { name: "Tus rutas" });
  await expect(rutas.getByRole("heading", { name: "Data Analyst" })).toBeVisible();
  await expect(rutas.getByText("Ruta sugerida: Ciberseguridad")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("el admin no ve la bienvenida y oculta una ruta filtrada desde /admin/rutas", async ({ page }) => {
  await entrarComoAdmin(page);
  await expect(page.getByRole("dialog", { name: "Bienvenida a syntaxError.cl" })).toBeHidden();
  // La base de e2e se comparte entre corridas: si una anterior falló a la mitad, la ruta vuelve al estado del contenido.
  const reinicio = await page.request.patch("/api/admin/rutas/cloud-devops", { headers: { Origin: "http://localhost:3000" }, data: { estado: null } });
  expect(reinicio.ok()).toBe(true);

  await page.goto("/rutas");
  await expect(page.getByText("[CLOUD-DEVOPS] :: buffer_corrupt")).toBeVisible();

  await page.goto("/admin/rutas");
  const fila = page.getByRole("row", { name: /Cloud \/ DevOps/ });
  // "del contenido" también está en la opción "Volver al estado del contenido": se mira la celda del estado.
  const estado = fila.getByRole("cell").nth(1);
  await expect(estado).toContainText("filtrada");
  await expect(estado).toContainText("del contenido");
  await expect(fila.getByRole("option", { name: "Publicada" })).toBeDisabled();
  await fila.getByRole("combobox").selectOption("oculta");
  await fila.getByRole("button", { name: "Guardar estado" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cambiar estado" }).click();
  await expect(estado).toContainText("oculta");
  await expect(estado).toContainText("cambiado por admin@local.test");

  await page.goto("/rutas");
  await expect(page.getByText("[CLOUD-DEVOPS] :: buffer_corrupt")).toHaveCount(0);

  await page.goto("/admin/rutas");
  await fila.getByRole("combobox").selectOption("");
  await fila.getByRole("button", { name: "Guardar estado" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cambiar estado" }).click();
  await expect(estado).toContainText("filtrada");
  await expect(estado).toContainText("del contenido");
  await page.goto("/rutas");
  await expect(page.getByText("[CLOUD-DEVOPS] :: buffer_corrupt")).toBeVisible();
});
