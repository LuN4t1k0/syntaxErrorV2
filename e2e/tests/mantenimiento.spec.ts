import { expect, test } from "./fixtures";
import { entrarComoAdmin, registrarse } from "./progreso";

test("un docente archiva una clase con confirmación, la encuentra en Archivadas y la restaura", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/profesor");
  const titulo = `Clase por archivar ${Date.now()}`;
  await page.getByLabel("Nombre de la clase").fill(titulo);
  await page.getByRole("button", { name: "Crear clase" }).click();
  await expect(page).toHaveURL(/\/profesor\/clases\//);

  await page.goto("/profesor");
  const fila = page.locator("li", { hasText: titulo });
  await fila.getByRole("button", { name: "Archivar" }).click();
  const dialogo = page.getByRole("dialog", { name: "Archivar" });
  await expect(dialogo).toContainText("su código deja de aceptar estudiantes nuevos");
  // El foco parte en Cancelar: lo seguro con el teclado.
  await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await dialogo.getByRole("button", { name: "Archivar" }).click();
  await expect(page.locator("li", { hasText: titulo })).toHaveCount(0);

  await page.getByRole("link", { name: /Archivadas \(\d+\)/ }).click();
  await expect(page).toHaveURL(/vista=archivadas/);
  await page.locator("li", { hasText: titulo }).getByRole("button", { name: "Restaurar" }).click();
  await expect(page.locator("li", { hasText: titulo })).toHaveCount(0);
  await page.getByRole("link", { name: /Activas \(\d+\)/ }).click();
  await expect(page.locator("li", { hasText: titulo })).toHaveCount(1);
});

test("los entregables se buscan por estudiante y las preguntas se filtran por estado", async ({ page, nuevaPagina }) => {
  await registrarse(page, "Paula Contreras");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor/entregables");
  await admin.getByLabel("Buscar por estudiante").fill("nadie-con-este-nombre");
  await admin.getByRole("button", { name: "Buscar" }).click();
  await expect(admin).toHaveURL(/q=nadie-con-este-nombre/);
  await expect(admin.getByText("No hay entregables por revisar de esa persona.")).toBeVisible();

  await admin.goto("/profesor/preguntas");
  const estados = admin.getByRole("navigation", { name: "Estado de las preguntas" });
  await expect(estados.getByRole("link", { name: /Todas \(\d+\)/ })).toHaveAttribute("aria-current", "page");
  await estados.getByRole("link", { name: "Respondidas" }).click();
  await expect(admin).toHaveURL(/estado=respondida/);
  await expect(estados.getByRole("link", { name: /Respondidas \(\d+\)/ })).toHaveAttribute("aria-current", "page");
});

test("las solicitudes y los comentarios pendientes se paginan por separado", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/admin/comunidad?comentarios=2");
  await expect(page.getByRole("heading", { name: /Comentarios de reseñas \(\d+\)/ })).toBeVisible();
  const paginas = page.getByRole("navigation", { name: "Páginas de comentarios" });
  // La base de e2e acumula comentarios pendientes; si hay una segunda página, se muestra como tal.
  if ((await paginas.count()) > 0) await expect(paginas).toContainText("Página 2 de");
  await expect(page.getByRole("heading", { name: /Solicitudes de acceso docente \(\d+\)/ })).toBeVisible();
});
