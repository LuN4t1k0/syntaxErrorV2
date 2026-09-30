import { expect, test, type Page } from "./fixtures";

async function registrarse(page: Page, nombre: string): Promise<string> {
  const email = `admin-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

// El admin de desarrollo lo crea db-setup (SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD).
async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@local.test");
  await page.locator('input[name="password"]').fill("admin123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("una solicitud docente aprobada da acceso docente y llega un mensaje", async ({ page, nuevaPagina }) => {
  const email = await registrarse(page, "Rocío Tapia");
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Pedir acceso docente" }).click();
  await expect(page.getByText("Tu solicitud de acceso docente está en revisión.")).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/admin/comunidad");
  const solicitud = admin.locator("li", { hasText: email });
  await solicitud.getByRole("button", { name: "Aprobar" }).click();
  await expect(solicitud).toHaveCount(0);

  await page.goto("/perfil");
  await expect(page.getByText("Tienes acceso docente.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Docencia" })).toBeVisible();
  await page.goto("/dashboard/mensajes");
  await expect(page.getByText("Tu acceso docente fue aprobado")).toBeVisible();
});

test("un reporte resuelto con respuesta llega como mensaje y queda en la bitácora", async ({ page, nuevaPagina }) => {
  await registrarse(page, "Diego Salinas");
  const descripcion = `El filtro de rutas no responde en el celular (${Date.now()}).`;
  await page.goto("/reportar?pagina=%2Frutas");
  await page.getByLabel("Un error").check();
  await page.getByLabel("Descripción").fill(descripcion);
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByText("Gracias. Lo vamos a revisar.")).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/admin/reportes");
  const reporte = admin.locator("li", { hasText: descripcion });
  await reporte.getByLabel("Respuesta").fill("Gracias, ya lo corregimos.");
  await reporte.getByRole("button", { name: "Responder y resolver" }).click();
  await expect(reporte).toHaveCount(0);

  await page.goto("/dashboard/mensajes");
  await expect(page.getByText("Gracias, ya lo corregimos.")).toBeVisible();

  await admin.goto("/admin/bitacora?accion=report_resolved");
  await expect(admin.getByRole("cell", { name: "Reporte resuelto" }).first()).toBeVisible();
});

test("administración elimina una cuenta y su sesión abierta se cierra", async ({ page, nuevaPagina }) => {
  const email = await registrarse(page, "Paula Ríos");

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await admin.getByRole("link", { name: email }).click();
  await admin.getByLabel("Escribe el email de la cuenta para confirmar").fill(email);
  await admin.getByRole("button", { name: "Eliminar cuenta" }).click();
  await expect(admin).toHaveURL(/\/admin\/usuarios$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("una cuenta estudiante no puede entrar a administración", async ({ page }) => {
  await registrarse(page, "Tomás Pino");
  const respuesta = await page.goto("/admin");
  expect(respuesta?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(0);
});
