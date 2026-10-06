import { expect, type Page } from "./fixtures";

// El admin de desarrollo lo crea db-setup (SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD).
export async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@local.test");
  await page.locator('input[name="password"]').fill("admin123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// Aprueba por la API, con 2 en las tres dimensiones: no depende de que la página hidrate. La revisión con clics en
// el formulario la prueba recorrido.spec.
export async function aprobarEntregable(admin: Page, email: string) {
  // La lista se pagina y la base de e2e acumula entregables: se busca el de esta persona.
  await admin.goto(`/profesor/entregables?q=${encodeURIComponent(email)}`);
  const tarjeta = admin.locator("li", { hasText: email });
  await expect(tarjeta).toHaveCount(1);
  const entregableId = await tarjeta.locator("[data-entregable-id]").getAttribute("data-entregable-id");
  expect(entregableId, `entregable sin id para ${email}`).not.toBeNull();
  const respuesta = await admin.request.post(`/api/revision/entregables/${entregableId}`, {
    headers: { Origin: "http://localhost:3000" },
    data: { puntajes: { claridad: 2, ejecucion: 2, coherencia: 2 }, observaciones: {}, comentario: null },
  });
  expect(respuesta.ok(), `aprobación de entregable para ${email}`).toBe(true);
  await admin.reload();
  await expect(admin.locator("li", { hasText: email })).toHaveCount(0);
}
