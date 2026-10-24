import { expect, test } from "./fixtures";
import { aprobar, MISIONES, registrarse } from "./progreso";

const CASO = "herramientas-del-oficio";

test("el caso muestra dónde empezar y, al avanzar, dónde continuar, con estados que se distinguen", async ({ page, ip }) => {
  await registrarse(page, "Antonia Gálvez");
  await page.goto(`/casos/${CASO}`);
  const primera = page.getByRole("link", { name: /Tu primer repositorio/ });
  await expect(primera).toContainText("Empieza aquí →");
  await expect(primera).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("estado-01-tu-primer-repositorio")).toHaveText("Pendiente");
  await expect(page.getByTestId("estado-02-escribe-un-readme")).toHaveText("Bloqueada");

  await aprobar(page, ip, CASO, MISIONES[CASO].slice(0, 1));
  await page.reload();
  await expect(page.getByTestId("estado-01-tu-primer-repositorio")).toHaveText("Aprobada");
  const segunda = page.getByRole("link", { name: /Escribe un buen README/ });
  await expect(segunda).toContainText("Continuar aquí →");
  await expect(segunda).toHaveAttribute("aria-current", "step");
  await expect(primera).not.toHaveAttribute("aria-current", "step");

  await page.goto("/rutas/data-analyst");
  const aqui = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" }).getByRole("link", { name: /Herramientas del oficio/ });
  await expect(aqui).toContainText("Estás aquí");
  await expect(aqui).toContainText("Continuar");
  await page.getByText("¿Cómo leer este mapa?").click();
  await expect(page.getByText("se habilita al completar lo anterior")).toBeVisible();
});

test("en un teléfono, el botón del asistente se esconde al bajar por la lista y vuelve al subir", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto(`/casos/${CASO}`);
  const flotante = page.locator("[data-oculto]");
  await expect(page.getByRole("button", { name: "Asistente del curso" })).toBeVisible();
  await expect(flotante).toHaveAttribute("data-oculto", "false");
  await page.mouse.wheel(0, 500);
  await expect(flotante).toHaveAttribute("data-oculto", "true");
  await page.mouse.wheel(0, -200);
  await expect(flotante).toHaveAttribute("data-oculto", "false");
  await page.getByRole("button", { name: "Asistente del curso" }).click();
  await expect(page.getByRole("region", { name: "Asistente del curso" })).toBeVisible();
});

test("en el computador, el botón del asistente no se esconde al bajar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/casos/${CASO}`);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(300);
  await expect(page.locator("[data-oculto]")).toHaveAttribute("data-oculto", "false");
});
