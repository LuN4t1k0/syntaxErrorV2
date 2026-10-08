import { readFileSync, readdirSync } from "node:fs";
import { expect, reporteDeTarea, test, type Page } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

// Recorre cada lección de las clases en el navegador y la resuelve como una persona: escribe la solución en el editor,
// en la consulta o en las celdas (con el botón Rellenar), o elige las respuestas del quiz, y valida. Tarda varios minutos,
// así que no corre en la suite normal: npm run test:e2e:recorrido.
test.skip(!process.env.RECORRIDO, "solo con RECORRIDO=1 (npm run test:e2e:recorrido)");

const PREVIOS: Record<string, string[]> = {
  "clases-de-excel": ["herramientas-del-oficio"],
  "clases-de-sql": ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos"],
  "clases-de-python": ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur"],
  "clases-de-power-bi": ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen"],
  "clases-de-ia-para-datos": ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen", "clases-de-power-bi", "clinica-cordillera-central"],
};

// Lee una prop del MDX escrita como JSON en su propia línea: solucion={"..."} o preguntas={[...]}.
function prop<T>(texto: string, nombre: string): T | null {
  const coincidencia = new RegExp(`\\n  ${nombre}=\\{(.*)\\}\\n`).exec(texto);
  return coincidencia ? (JSON.parse(coincidencia[1]) as T) : null;
}

async function resolver(page: Page, tipo: string, texto: string) {
  if (tipo === "QuizTask") {
    const preguntas = prop<{ pregunta: string; opciones: string[]; correcta: number }[]>(texto, "preguntas") ?? [];
    for (const [indice, pregunta] of preguntas.entries()) {
      await page.getByRole("group", { name: `${indice + 1}. ${pregunta.pregunta}`, exact: true }).getByLabel(pregunta.opciones[pregunta.correcta], { exact: true }).check();
    }
  } else if (tipo === "SqlTask") {
    await page.getByLabel("Consulta SQL").fill(prop<string>(texto, "solucion") ?? "");
  } else if (tipo === "PythonTask") {
    await expect(page.getByText("Python listo").first()).toBeVisible({ timeout: 150_000 });
    await page.getByLabel("Código Python").fill(prop<string>(texto, "solucion") ?? "");
  } else if (tipo === "MarkdownTask") {
    await page.getByLabel(`Tu ${prop<string>(texto, "documento") ?? "README"}`).fill(prop<string>(texto, "solucion") ?? "");
  } else if (tipo === "SheetTask") {
    for (const [rango, contenido] of Object.entries(prop<Record<string, string | number>>(texto, "solucion") ?? {})) {
      const primera = page.getByRole("button", { name: `Celda ${rango.split(":")[0]}`, exact: true });
      await primera.click();
      await page.getByLabel("Fórmula").fill(String(contenido));
      await page.getByLabel("Fórmula").press("Enter");
      if (rango.includes(":")) {
        await primera.click();
        await page.getByRole("button", { name: /^Rellenar hasta la fila/ }).click();
      }
    }
  }
}

for (const [curso, previos] of Object.entries(PREVIOS)) {
  test(`cada lección de ${curso} se resuelve en el navegador`, async ({ page, ip, nuevaPagina }) => {
    test.setTimeout(1_500_000);
    const directorio = `/app/content/casos/${curso}/misiones`;
    const email = await registrarse(page, "Recorrido de clases");
    const admin = await nuevaPagina();
    await entrarComoAdmin(admin);
    for (const caso of previos) await completarCaso(page, admin, ip, email, caso);

    const fallidas: string[] = [];
    for (const archivo of readdirSync(directorio).filter((nombre) => nombre.endsWith(".mdx")).sort()) {
      const mision = archivo.replace(/\.mdx$/, "");
      const texto = readFileSync(`${directorio}/${archivo}`, "utf8");
      const tipo = /<(\w+Task)/.exec(texto)?.[1] ?? "";
      const tarea = /<\w+Task[\s\S]*?id="([^"]+)"/.exec(texto)?.[1] ?? "";
      try {
        await page.goto(`/casos/${curso}/${mision}`);
        await resolver(page, tipo, texto);
        const reporte = reporteDeTarea(page);
        await page.getByRole("button", { name: "Validar" }).click();
        if (!(await reporte).request().postDataJSON().aprobada) fallidas.push(`${mision}: la solución no aprueba en el navegador`);
      } catch (error) {
        fallidas.push(`${mision}: ${(error as Error).message.split("\n")[0]}`);
      }
      // La lección siguiente puede depender de esta: se deja aprobada para seguir el recorrido.
      await aprobar(page, ip, curso, [[mision, tarea]]);
    }
    expect(fallidas).toEqual([]);
  });
}
