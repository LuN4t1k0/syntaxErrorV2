import { expect, test, type Page } from "./fixtures";
import { entrarComoAdmin } from "./progreso";

// La terminal de bienvenida (spec 2026-10-06): aparece una vez en el panel de cada estudiante nueva.
async function registrarseSinCerrar(page: Page, nombre: string) {
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(`bienvenida-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const terminal = page.getByRole("dialog", { name: "Bienvenida a syntaxError.cl" });
  await expect(terminal).toBeVisible();
  return terminal;
}

test("una estudiante nueva elige su ruta con el teclado, llega al mapa y la terminal no vuelve a aparecer", async ({ page }) => {
  const terminal = await registrarseSinCerrar(page, "Florencia Huenchumil");
  await expect(terminal.getByText("> hola, Florencia. iniciando syntaxError.cl…")).toBeVisible();
  const prompt = terminal.getByLabel("Prompt de bienvenida");
  await expect(prompt).toBeFocused();
  await expect(terminal.getByText("florencia@syntaxerror.cl:~$").first()).toBeVisible();
  // Data Analyst es la primera ruta abierta: queda seleccionada y se elige con Enter.
  await expect(terminal.getByRole("option", { selected: true })).toContainText("data-analyst/");
  await prompt.press("Enter");

  await expect(page).toHaveURL(/\/rutas\/data-analyst$/);
  const aqui = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" }).getByRole("link", { name: /Herramientas del oficio/ });
  await expect(aqui).toContainText("Estás aquí");

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Hola, Florencia Huenchumil" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Bienvenida a syntaxError.cl" })).toBeHidden();
  const continuar = page.getByRole("region", { name: "Continuar" });
  await expect(continuar).toContainText("Tu ruta: Data Analyst");
  await expect(continuar).toContainText("Empieza por Herramientas del oficio");
  await expect(continuar.getByRole("link", { name: "Empezar" })).toHaveAttribute("href", "/rutas/data-analyst");
  await expect(page.getByRole("region", { name: "Tus rutas" })).toContainText("tu ruta");

  // "¿Cómo funciona?" la vuelve a mostrar, y salir con explorar no cambia la ruta elegida.
  await page.getByRole("button", { name: "¿Cómo funciona?" }).click();
  const deNuevo = page.getByRole("dialog", { name: "Bienvenida a syntaxError.cl" });
  await deNuevo.getByLabel("Prompt de bienvenida").fill("explorar");
  await deNuevo.getByLabel("Prompt de bienvenida").press("Enter");
  await expect(deNuevo).toBeHidden();
  await page.reload();
  await expect(page.getByRole("region", { name: "Continuar" })).toContainText("Tu ruta: Data Analyst");
});

test("en el teléfono: una ruta filtrada responde acceso denegado y explorar entra sin ruta", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const terminal = await registrarseSinCerrar(page, "Ignacio Catrileo");
  const caja = await terminal.boundingBox();
  expect(caja?.width).toBeGreaterThanOrEqual(389);

  const prompt = terminal.getByLabel("Prompt de bienvenida");
  await prompt.fill("cat ciberseguridad");
  await prompt.press("Enter");
  await expect(terminal.getByText("[CIBERSEGURIDAD] :: buffer_corrupt")).toBeVisible();
  await prompt.fill("elegir ciberseguridad");
  await prompt.press("Enter");
  await expect(terminal.getByText(/acceso denegado: ciberseguridad · LEAK_0x/)).toBeVisible();
  await prompt.press("Escape");
  await expect(terminal).toBeVisible();
  await expect(terminal.getByText("la bienvenida no se cierra con Esc")).toBeVisible();

  await terminal.getByRole("button", { name: "explorar sin elegir" }).click();
  await expect(terminal).toBeHidden();
  const elegir = page.getByRole("region", { name: "Elige tu ruta" });
  await expect(elegir.getByRole("heading", { name: "Data Analyst" })).toBeVisible();
  await expect(elegir.getByText("[CIBERSEGURIDAD] :: buffer_corrupt")).toBeVisible();
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
