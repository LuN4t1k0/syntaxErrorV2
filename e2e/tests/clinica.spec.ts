import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "clinica-cordillera-central";

test("los datos de un caso se descargan como CSV desde la página del caso", async ({ page }) => {
  await page.goto(`/casos/${CASO}`);
  const enlace = page.getByRole("link", { name: "atenciones.csv" });
  await expect(enlace).toHaveAttribute("href", `/casos/${CASO}/datos/atenciones.csv`);
  await expect(page.getByText("1200 filas", { exact: false })).toBeVisible();
  const respuesta = await page.request.get(`/casos/${CASO}/datos/sedes.csv`);
  expect(respuesta.headers()["content-type"]).toBe("text/csv; charset=utf-8");
  expect(await respuesta.text()).toContain("Sede Ñuñoa");
});

test("con los casos 0 a 3 y sus clases completos: escribe la ficha del dashboard y calcula un indicador", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Matías Contreras");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen", "clases-de-power-bi"]) await completarCaso(page, admin, ip, email, caso);

  await page.goto(`/casos/${CASO}/01-la-pregunta-del-dashboard`);
  await page.getByLabel("Tu README").fill("# Dashboard de operaciones\n\n## Audiencia\n\nDirectorio.\n\n## Preguntas\n\n- ¿Cuánto esperan en urgencia?\n\n## Indicadores\n\n| Indicador | Fórmula |\n| --- | --- |\n| Espera | promedio de minutos |");
  await expect(page.getByRole("region", { name: "Vista previa" }).getByRole("table")).toBeVisible();
  // Se espera a que la aprobación llegue al servidor: la misión 2 la exige.
  const aprobada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await aprobar(page, ip, CASO, [
    ["02-preparar-los-datos", "atenciones-con-nombres"],
    ["02-preparar-los-datos", "control-por-tipo"],
  ]);
  await page.goto(`/casos/${CASO}/03-calcular-indicadores`);
  const consultas = page.getByLabel("Consulta SQL");
  await consultas.first().fill("SELECT e.nombre, ROUND(SUM(CASE WHEN a.estado = 'inasistencia' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2) AS tasa FROM atenciones a JOIN especialidades e ON a.especialidad_id = e.id GROUP BY e.nombre");
  await page.getByRole("button", { name: "Validar" }).first().click();
  // Sin filtrar las consultas, la especialidad Urgencia se suma a la lista.
  await expect(page.getByText("Tu consulta trae 8 filas, se esperan 7.")).toBeVisible();
  await consultas.first().fill("SELECT e.nombre, ROUND(SUM(CASE WHEN a.estado = 'inasistencia' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2) AS tasa FROM atenciones a JOIN especialidades e ON a.especialidad_id = e.id WHERE a.tipo = 'consulta' GROUP BY e.nombre");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await expect(page.getByText("¡Tarea aprobada!").first()).toBeVisible();
});
