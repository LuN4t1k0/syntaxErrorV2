import { cerrarBienvenida, expect, test } from "./fixtures";

test("el registro conserva el foco visible por teclado y cabe en móvil en ambos temas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/registro");
  for (const tema of ["oscuro", "claro"]) {
    const toggle = page.getByRole("button", { name: `Usar tema ${tema}` });
    if (await toggle.count()) await toggle.click();
    await page.getByLabel("Contraseña", { exact: true }).focus();
    await page.keyboard.press("Tab");
    const crear = page.getByRole("button", { name: "Crear cuenta gratis" });
    await expect(crear).toBeFocused();
    const foco = await crear.evaluate((elemento) => {
      const estilo = getComputedStyle(elemento);
      return (
        elemento.matches(":focus-visible") &&
        estilo.outlineStyle !== "none" &&
        parseFloat(estilo.outlineWidth) >= 2
      );
    });
    expect(foco).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  }
});

test("el registro recupera el botón y explica una desconexión", async ({
  page,
}) => {
  await page.route("**/api/auth/register", (ruta) => ruta.abort());
  await page.goto("/registro");
  await page.getByLabel("Nombre", { exact: true }).fill("Amalia Rojas");
  await page.getByLabel("Email", { exact: true }).fill("amalia@correo.cl");
  await page.getByLabel("Contraseña", { exact: true }).fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Revisa tu conexión" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear cuenta gratis" }),
  ).toBeEnabled();
});

test("una alumna se registra, entra al dashboard y cierra sesión", async ({
  page,
}) => {
  const email = `alumna-${Date.now()}@correo.cl`;

  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Camila Rojas");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await cerrarBienvenida(page);
  await expect(
    page.getByRole("heading", { name: "Hola, Camila Rojas" }),
  ).toBeVisible();

  await page.getByLabel("Abrir menú de perfil").click();
  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(
    /\/login\?callbackUrl=%2Fdashboard|\/login\?callbackUrl=\/dashboard/,
  );
});

test("el login acepta el email con otras mayúsculas", async ({
  page,
  request,
  ip,
}) => {
  const email = `mayus-${Date.now()}@correo.cl`;
  const res = await request.post("/api/auth/register", {
    headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
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
  await page
    .locator('input[name="email"]')
    .fill(`nadie-${Date.now()}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-incorrecta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
