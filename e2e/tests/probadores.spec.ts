import { expect, test, type Page } from "./fixtures";
import { entrarComoAdmin, registrarse } from "./progreso";

const MISION = "/casos/minimarkets-del-sur/02-filtrar";

async function dejarOrdenNormal(page: Page) {
  await entrarComoAdmin(page);
  await page.goto("/admin");
  const volver = page.getByRole("button", { name: "Volver al orden normal" });
  if (await volver.isVisible().catch(() => false)) {
    await volver.click();
    const dialogo = page.getByRole("dialog", { name: "Volver al orden normal" });
    await dialogo.getByRole("button", { name: "Volver al orden normal" }).click();
  }
  await expect(page.getByRole("button", { name: "Liberar el orden para todos" })).toBeVisible();
}

test("un admin marca a una persona como probadora y ella hace la ruta en el orden que quiera", async ({ page, ip, nuevaPagina }) => {
  const email = await registrarse(page, "Josefina Lagos");
  const aprobarFiltro = () =>
    page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "minimarkets-del-sur", mision: "02-filtrar", tarea: "lacteos-caros", aprobada: true },
    });

  const admin = await nuevaPagina();
  await dejarOrdenNormal(admin);

  // Sin ser probadora: el Caso 2 está bloqueado (falta el Caso 1) y su segunda misión también (falta la primera).
  await page.goto(MISION);
  await expect(page.getByRole("status").filter({ hasText: "se habilita al completar" }).first()).toBeVisible();
  expect((await aprobarFiltro()).status()).toBe(409);

  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await admin.getByRole("link", { name: email }).click();
  await admin.getByLabel("Probador", { exact: false }).check();
  await admin.getByRole("button", { name: "Guardar probador" }).click();
  await expect(admin.getByText("Ahora es probador.")).toBeVisible();
  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await expect(admin.getByRole("row", { name: new RegExp(email) }).getByText("Probador")).toBeVisible();

  // Como probadora: sin avisos de bloqueo, el servidor acepta la misión y el mapa no muestra nada bloqueado.
  await page.goto(MISION);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar" }).first()).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: /se habilita al completar|primero aprueba la misión/ })).toHaveCount(0);
  expect((await aprobarFiltro()).status()).toBe(200);
  await page.goto("/rutas/data-analyst");
  const mapa = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" });
  await expect(mapa.getByRole("link", { name: /Minimarkets del Sur.*: disponible$/ })).toBeVisible();
  await expect(mapa.getByText("Bloqueado", { exact: true })).toHaveCount(0);
});

test("la administración muestra el interruptor del orden de las rutas", async ({ page }) => {
  await dejarOrdenNormal(page);
  await expect(page.getByRole("heading", { name: "Orden de las rutas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Liberar el orden para todos" })).toBeVisible();
});
