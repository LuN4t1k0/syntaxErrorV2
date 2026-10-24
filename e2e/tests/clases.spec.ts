import { expect, reporteDeTarea, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, MISIONES, registrarse } from "./progreso";

const CLASES = "clases-de-sql";

test("la ruta muestra las clases antes del caso de SQL, sin entregable ni rúbrica", async ({ page }) => {
  await page.goto("/rutas/data-analyst");
  const clases = page.getByRole("link", { name: /Clases de SQL/ });
  await expect(clases).toContainText("18 lecciones");
  // Las clases no cuentan en la numeración, que parte del Caso 0 como en la propuesta: Minimarkets es el Caso 2.
  await expect(page.getByRole("link", { name: /Minimarkets del Sur/ })).toContainText("Caso 2 · Minimarkets del Sur");
  await page.goto(`/casos/${CLASES}`);
  await expect(page.getByText("> clases")).toBeVisible();
  await expect(page.getByText("Lección 1 · 12 min")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu avance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu entregable" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cómo se revisa tu entregable" })).toHaveCount(0);
});

test("con los casos 0 y 1 completos: resuelve una lección y, al aprobarlas todas, se habilita el Caso 2", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(180_000);
  const email = await registrarse(page, "Valentina Soto");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos"]) await completarCaso(page, admin, ip, email, caso);

  await page.goto(`/casos/${CLASES}/01-select-basico`);
  await expect(page.getByText("> lección 1/18 · 12 min")).toBeVisible();
  await expect(page.getByText("Sintaxis", { exact: true })).toBeVisible();
  const consulta = page.getByLabel("Consulta SQL");
  await consulta.fill("SELECT nombre FROM estudiantes");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("Tu consulta debe devolver 2 columnas", { exact: false })).toBeVisible();
  await consulta.fill("SELECT nombre, correo FROM estudiantes");
  const aprobada = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();

  // En el panel, las clases se cuentan en lecciones y se continúan como lecciones.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Tus casos prácticos y clases" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Clases de SQL/ }).filter({ hasText: "1/18 lecciones" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Continuar" }).getByRole("heading", { name: "Alias y expresiones calculadas" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Continuar" })).toContainText("> continuar · Clases de SQL");
  await expect(page.getByRole("link", { name: "Continuar lección" })).toHaveAttribute("href", `/casos/${CLASES}/02-alias-expresiones`);

  await page.goto("/casos/minimarkets-del-sur");
  await expect(page.getByText("sus tareas se habilitan al completar", { exact: false })).toContainText("Clases de SQL");
  await aprobar(page, ip, CLASES, MISIONES[CLASES].slice(1));
  await page.goto(`/casos/${CLASES}`);
  await expect(page.getByText("Clases completas", { exact: false })).toBeVisible();
  await page.goto("/casos/minimarkets-del-sur");
  await expect(page.getByText("sus tareas se habilitan al completar", { exact: false })).toHaveCount(0);
});

test("con el Caso 0 completo: las clases de Excel traen su propia planilla y un quiz se aprueba con todo correcto", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(180_000);
  const email = await registrarse(page, "Martina Rojas");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");
  const excel = MISIONES["clases-de-excel"];
  await aprobar(page, ip, "clases-de-excel", excel.slice(0, 1));

  await page.goto("/casos/clases-de-excel/02-primera-formula");
  await expect(page.getByText("> lección 2/23", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Celda A2", exact: true })).toHaveText("Notebook");
  await expect(async () => {
    await page.getByRole("button", { name: "Celda D2", exact: true }).click();
    await page.getByLabel("Fórmula").fill("=B2*C2");
    await page.getByLabel("Fórmula").press("Enter");
    await expect(page.getByRole("button", { name: "Celda D2", exact: true })).toHaveText("1350000", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.getByRole("button", { name: "Celda D3", exact: true }).click();
  await page.getByLabel("Fórmula").fill("=B3*C3");
  await page.getByLabel("Fórmula").press("Enter");
  await expect(page.getByRole("button", { name: "Celda D3", exact: true })).toHaveText("120000");
  const aprobada = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();

  await aprobar(page, ip, "clases-de-excel", excel.slice(2, 21));
  await page.goto("/casos/clases-de-excel/22-excel-vs-base-de-datos");
  await page.getByLabel("Una base de datos, consultada con SQL.").check();
  await page.getByLabel("Excel, con SUMAR.SI o una tabla dinámica.").check();
  await page.getByLabel("Reglas: tipos de dato obligatorios y relaciones que no se pueden romper.").check();
  const respondida = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await respondida;
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
});

test("con el Caso 2 completo: una lección de Python se resuelve en el editor y no revela el valor esperado", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Josefa Paillalef");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur"]) await completarCaso(page, admin, ip, email, caso);
  await aprobar(page, ip, "clases-de-python", MISIONES["clases-de-python"].slice(0, 1));

  await page.goto("/casos/clases-de-python/02-operadores");
  await expect(page.getByText("> lección 2/34", { exact: false })).toBeVisible();
  await expect(page.getByText("Python listo").first()).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.cm-content[aria-label="Código Python"]')).toBeVisible({ timeout: 30_000 });
  const codigo = page.getByLabel("Código Python");
  await codigo.fill("precio_final = precio * descuento\npoco_stock = stock < 5\nreponer_urgente = poco_stock and precio > 100000");
  const fallida = reporteDeTarea(page, false);
  await page.getByRole("button", { name: "Validar" }).click();
  await fallida;
  await expect(page.getByText("precio_final no da lo esperado", { exact: false })).toBeVisible();
  await expect(page.getByText("405000")).toHaveCount(0);
  await codigo.fill("precio_final = precio * (1 - descuento)\npoco_stock = stock < 5\nreponer_urgente = poco_stock and precio > 100000");
  const aprobada = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();
});

test("con el Caso 3 completo: una práctica de Power BI muestra sus pasos, su dataset y su quiz revisa el resultado", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Catalina Nahuel");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen"]) {
    await completarCaso(page, admin, ip, email, caso);
  }
  await aprobar(page, ip, "clases-de-power-bi", MISIONES["clases-de-power-bi"].slice(0, 1));

  await page.goto("/casos/clases-de-power-bi/02-instalar-y-conectar-datos");
  await expect(page.getByText("> lección 2/34", { exact: false })).toBeVisible();
  await expect(page.getByText("En la pestaña Inicio, haz clic en 'Obtener datos' y elige 'Texto/CSV'.")).toBeVisible();
  const enlace = page.getByRole("link", { name: "ventas.csv" });
  await expect(enlace).toHaveAttribute("href", "/casos/clases-de-power-bi/datos/ventas.csv");
  const csv = await page.request.get("/casos/clases-de-power-bi/datos/ventas.csv");
  expect((await csv.text()).split("\n")[0]).toBe("fecha,producto,region,monto");

  // La práctica se hace en Power BI Desktop; el quiz revisa su resultado, y cada respuesta se elige dentro de su pregunta.
  const pregunta = (texto: RegExp) => page.getByRole("group", { name: texto });
  await pregunta(/Cuántas columnas tiene la tabla ventas/).getByLabel("4", { exact: true }).check();
  await pregunta(/Cuántas filas de ventas tiene el archivo/).getByLabel("6", { exact: true }).check();
  await pregunta(/configuración regional/).getByLabel("Para que una fecha como 01/03/2026 se lea como 1 de marzo y no como 3 de enero.").check();
  const fallida = reporteDeTarea(page, false);
  await page.getByRole("button", { name: "Validar" }).click();
  await fallida;
  await expect(page.getByText("Tienes 2 de 3 respuestas correctas. Revisa la pregunta 2.")).toBeVisible();
  await pregunta(/Cuántas filas de ventas tiene el archivo/).getByLabel("8", { exact: true }).check();
  const aprobada = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
});

test("con el Caso 4 completo: el quiz de IA para datos marca qué revisar sin dar la respuesta y se aprueba con todo correcto", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Antonia Quilapán");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen", "clases-de-power-bi", "clinica-cordillera-central"]) {
    await completarCaso(page, admin, ip, email, caso);
  }
  await aprobar(page, ip, "clases-de-ia-para-datos", MISIONES["clases-de-ia-para-datos"].slice(0, 4));

  await page.goto("/casos/clases-de-ia-para-datos/05-clasificacion-y-etiquetas");
  await expect(page.getByText("> lección 5/14", { exact: false })).toBeVisible();
  const responder = async (segunda: string) => {
    await page.getByLabel("La 2: un cargo de envío que no correspondía es un problema de cobro, aunque mencione el envío.").check();
    await page.getByLabel(segunda).check();
    await page.getByLabel("Agregar a la definición de cobro un ejemplo de cargo de envío indebido, y pedir una razón junto a cada etiqueta.").check();
    const reportado = reporteDeTarea(page);
    await page.getByRole("button", { name: "Validar" }).click();
    await reportado;
  };
  await expect(async () => {
    await responder("Dejarlo en despacho, que es lo primero que menciona.");
    await expect(page.getByText("Tienes 2 de 3 respuestas correctas. Revisa la pregunta 2.")).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByText("Revisa esta pregunta.")).toHaveCount(1);
  await expect(page.getByText("Es un caso mixto: queda visible para que una persona decida cómo contarlo.")).toHaveCount(0);

  await responder("Marcarlo como revisar: tiene un problema de despacho y uno de cobro.");
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
  await expect(page.getByText("Es un caso mixto: queda visible para que una persona decida cómo contarlo.")).toBeVisible();
});
