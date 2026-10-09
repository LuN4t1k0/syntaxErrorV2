import { expect, test } from "./fixtures";

test("un visitante descubre el ejemplo guiado y abre el registro real", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Empieza de cero.Aprende a trabajarcon datos.",
  );
  await expect(
    page.getByText("PROPUESTA VISUAL", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Analista de datos", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Analista SOC junior" }),
  ).toHaveCount(0);

  const terminal = page.getByRole("region", {
    name: "Los datos cuentan algo. Descúbrelo.",
  });
  await terminal
    .getByRole("button", { name: "Descubrir la respuesta" })
    .click();
  await expect(terminal.getByRole("status")).toContainText(
    "[ok] Antofagasta vendió más: $574.000.",
  );
  await expect(terminal.getByRole("listitem").first()).toContainText(
    "Antofagasta",
  );
  await expect(
    terminal.getByRole("button", { name: "Respuesta encontrada" }),
  ).toBeDisabled();
  await terminal.getByText("Ver cómo se hace con SQL", { exact: true }).click();
  await expect(terminal.locator("pre")).toContainText("GROUP BY comuna");
  await terminal.getByRole("link", { name: "Empezar gratis" }).click();
  await expect(page).toHaveURL(/\/registro$/);
  await expect(
    page.getByRole("heading", { name: "Crear cuenta" }),
  ).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`la portada cabe a ${width}px en ambos temas y muestra el CTA antes de la demo`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    for (const theme of ["light", "dark"]) {
      const toggle = page.getByRole("button", {
        name: theme === "light" ? "Usar tema claro" : "Usar tema oscuro",
      });
      if (await toggle.count()) await toggle.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const cta = page
        .locator(".hero-actions")
        .getByRole("link", { name: "Empezar gratis" });
      const box = await cta.boundingBox();
      expect(box!.y + box!.height).toBeLessThan(page.viewportSize()!.height);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
      if (width < 500) {
        const demo = await page.locator("#demo").boundingBox();
        expect(box!.y + box!.height).toBeLessThan(demo!.y);
      }
    }
    await page
      .getByText("¿Necesito instalar programas?", { exact: true })
      .click();
    await expect(
      page
        .locator(".faq-list details[open]")
        .filter({ hasText: "¿Necesito instalar programas?" }),
    ).toContainText("Power BI Desktop");
  });
}

test("el contenido, la explicación y el registro siguen accesibles sin JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3000/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Empieza de cero.",
    );
    await expect(
      page
        .getByRole("list", { name: "Ventas totales por comuna" })
        .getByRole("listitem"),
    ).toHaveCount(4);
    await expect(page.locator("noscript p")).toBeVisible();
    await expect(page.locator("noscript p")).toContainText("activa JavaScript");
    await page.getByText("Ver cómo se hace con SQL", { exact: true }).click();
    await expect(page.locator("pre")).toBeVisible();
    await page
      .locator(".hero-actions")
      .getByRole("link", { name: "Empezar gratis" })
      .click();
    await expect(page).toHaveURL(/\/registro$/);
  } finally {
    await context.close();
  }
});

test("el enlace de inicio lleva desde la portada a la primera lección", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".hero-actions")
    .getByRole("link", { name: "Empezar gratis" })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Alumna Portada");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`portada-${Date.now()}@correo.cl`);
  await page.getByLabel("Contraseña", { exact: true }).fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  const bienvenida = page.getByRole("dialog", {
    name: "Bienvenida a syntaxError.cl",
  });
  await expect(bienvenida).toBeVisible();
  await expect(
    bienvenida.getByRole("option", { selected: true }),
  ).toContainText("data-analyst/");
  await bienvenida.getByLabel("Prompt de bienvenida").press("Enter");
  await expect(page).toHaveURL(
    /\/casos\/herramientas-del-oficio\/01-tu-primer-repositorio$/,
  );
  await expect(
    page.getByRole("heading", { name: /Tu primer repositorio/ }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});
