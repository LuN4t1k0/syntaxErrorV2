import { expect, test } from "@playwright/test";

test("una alumna se registra, entra al dashboard y cierra sesión", async ({ page }) => {
  const email = `alumna-${Date.now()}@correo.cl`;

  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Camila Rojas");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Hola, Camila Rojas" })).toBeVisible();

  await page.getByLabel("Abrir menú de perfil").click();
  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard|\/login\?callbackUrl=\/dashboard/);
});

test("el login acepta el email con otras mayúsculas", async ({ page, request }) => {
  const email = `mayus-${Date.now()}@correo.cl`;
  const res = await request.post("/api/auth/register", {
    headers: { Origin: "http://localhost:3000" },
    data: { name: "Diego", email, password: "clave-segura-123" },
  });
  expect(res.status()).toBe(201);

  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email.toUpperCase());
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("el login muestra un error con la clave incorrecta", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(`nadie-${Date.now()}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-incorrecta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Email o password incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
