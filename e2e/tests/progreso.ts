import { cerrarBienvenida, expect, type Page } from "./fixtures";
import { entrarComoAdmin } from "./revision";

// Misiones y tareas de cada caso de la ruta, en orden: sirven para llegar a un caso con sus requisitos cumplidos.
export const MISIONES: Record<string, [string, string][]> = {
  "herramientas-del-oficio": [
    ["01-tu-primer-repositorio", "primer-repositorio"],
    ["02-escribe-un-readme", "readme-de-proyecto"],
    ["03-archivos-y-commits", "commits-propios"],
    ["04-ordena-tu-proyecto", "proyecto-ordenado"],
    ["05-el-readme-de-tu-proyecto", "readme-del-proyecto"],
    ["06-tu-perfil-de-github", "perfil"],
    ["07-tu-presentacion", "presentacion"],
  ],
  "clases-de-excel": [
    ["01-que-es-una-hoja-de-calculo", "que-es-una-hoja-de-calculo"],
    ["02-primera-formula", "primera-formula"],
    ["03-orden-de-operaciones", "orden-de-operaciones"],
    ["04-funcion-suma", "funcion-suma"],
    ["05-funcion-promedio", "funcion-promedio"],
    ["06-contar-max-min", "contar-max-min"],
    ["07-referencias-relativas", "referencias-relativas"],
    ["08-referencias-absolutas", "referencias-absolutas"],
    ["09-la-funcion-si", "la-funcion-si"],
    ["10-y-o-condiciones", "y-o-condiciones"],
    ["11-si-anidados", "si-anidados"],
    ["12-sumar-si", "sumar-si"],
    ["13-contar-si", "contar-si"],
    ["14-funciones-conjunto", "funciones-conjunto"],
    ["15-buscarv", "buscarv"],
    ["16-indice-coincidir", "indice-coincidir"],
    ["17-buscarv-vs-indice", "buscarv-vs-indice"],
    ["18-funciones-de-texto", "funciones-de-texto"],
    ["19-fechas", "fechas"],
    ["20-descripcion-de-venta", "descripcion-de-venta"],
    ["21-errores-comunes", "errores-comunes"],
    ["22-excel-vs-base-de-datos", "excel-vs-base-de-datos"],
    ["23-proyecto-final-reporte-ventas", "proyecto-final-reporte-ventas"],
  ],
  "despachos-rapidos": [
    ["01-conoce-la-planilla", "costo-con-iva"],
    ["02-totales-del-mes", "totales"],
    ["03-condiciones", "condiciones"],
    ["04-buscar-en-otra-tabla", "buscar-tarifas"],
    ["05-limpiar-los-datos", "marcar-problemas"],
    ["06-resumir-por-comuna", "resumen-por-comuna"],
    ["07-indicadores-de-entrega", "indicadores"],
    ["08-revisar-la-formula-de-la-ia", "corregir-buscarv"],
    ["09-resumen-para-la-duena", "resumen-de-marzo"],
  ],
  "clases-de-sql": [
    ["01-select-basico", "select-basico"],
    ["02-alias-expresiones", "alias-expresiones"],
    ["03-where-filtros", "where-filtros"],
    ["04-busqueda-orden-limite", "busqueda-orden-limite"],
    ["05-join-inner", "join-inner"],
    ["06-join-multiple-left", "join-multiple-left"],
    ["07-null-coalesce", "null-coalesce"],
    ["08-funciones-texto", "funciones-texto"],
    ["09-funciones-numericas", "funciones-numericas"],
    ["10-funciones-agregacion", "funciones-agregacion"],
    ["11-group-by-having", "group-by-having"],
    ["12-case-when", "case-when"],
    ["13-subconsultas-where", "subconsultas-where"],
    ["14-subconsultas-from", "subconsultas-from"],
    ["15-cte-with", "cte-with"],
    ["16-union", "union"],
    ["17-exists", "exists"],
    ["18-proyecto-final-sql", "proyecto-final-sql"],
  ],
  "clases-de-power-bi": [
    ["01-que-es-power-bi", "que-es-power-bi"],
    ["02-instalar-y-conectar-datos", "instalar-y-conectar-datos"],
    ["03-la-interfaz-de-power-bi", "la-interfaz-de-power-bi"],
    ["04-que-es-power-query", "que-es-power-query"],
    ["05-transformar-datos", "transformar-datos"],
    ["06-combinar-consultas", "combinar-consultas"],
    ["07-limpiar-datos-reales", "limpiar-datos-reales"],
    ["08-vista-de-modelo", "vista-de-modelo"],
    ["09-crear-relaciones", "crear-relaciones"],
    ["10-cardinalidad-y-direccion-del-filtro", "cardinalidad-y-direccion-del-filtro"],
    ["11-modelo-estrella", "modelo-estrella"],
    ["12-tabla-de-calendario", "tabla-de-calendario"],
    ["13-medidas-vs-columnas-calculadas", "medidas-vs-columnas-calculadas"],
    ["14-sintaxis-basica-de-dax", "sintaxis-basica-de-dax"],
    ["15-funciones-de-agregacion", "funciones-de-agregacion"],
    ["16-formato-de-una-medida", "formato-de-una-medida"],
    ["17-calculate-y-contexto", "calculate-y-contexto"],
    ["18-variables-en-dax", "variables-en-dax"],
    ["19-contexto-de-fila-vs-contexto-de-filtro", "contexto-de-fila-vs-contexto-de-filtro"],
    ["20-funciones-iteradoras-sumx-averagex", "funciones-iteradoras-sumx-averagex"],
    ["21-funciones-de-tiempo-basicas", "funciones-de-tiempo-basicas"],
    ["22-inteligencia-de-tiempo-real", "inteligencia-de-tiempo-real"],
    ["23-tipos-de-grafico", "tipos-de-grafico"],
    ["24-tarjetas-y-tablas", "tarjetas-y-tablas"],
    ["25-formato-condicional", "formato-condicional"],
    ["26-tooltips", "tooltips"],
    ["27-slicers", "slicers"],
    ["28-cross-filtering", "cross-filtering"],
    ["29-drill-down-y-drill-through", "drill-down-y-drill-through"],
    ["30-publicar-a-power-bi-service", "publicar-a-power-bi-service"],
    ["31-compartir-y-exportar", "compartir-y-exportar"],
    ["32-buenas-practicas-de-diseno", "buenas-practicas-de-diseno"],
    ["33-power-bi-vs-excel-sql-python", "power-bi-vs-excel-sql-python"],
    ["34-proyecto-final-dashboard-ventas", "proyecto-final-dashboard-ventas"],
  ],
  "clases-de-ia-para-datos": [
    ["01-bienvenida-ia-para-datos", "bienvenida-ia-para-datos"],
    ["02-entender-tablas-y-columnas", "entender-tablas-y-columnas"],
    ["03-calidad-de-datos", "calidad-de-datos"],
    ["04-limpieza-asistida", "limpieza-asistida"],
    ["05-clasificacion-y-etiquetas", "clasificacion-y-etiquetas"],
    ["06-formulas-y-hojas-calculo", "formulas-y-hojas-calculo"],
    ["07-sql-asistido", "sql-asistido"],
    ["08-analisis-exploratorio", "analisis-exploratorio"],
    ["09-graficos-y-visualizaciones", "graficos-y-visualizaciones"],
    ["10-explicar-hallazgos", "explicar-hallazgos"],
    ["11-reportes-asistidos", "reportes-asistidos"],
    ["12-sesgos-y-errores", "sesgos-y-errores"],
    ["13-privacidad-en-datos", "privacidad-en-datos"],
    ["14-proyecto-final-analisis-datos", "proyecto-final-analisis-datos"],
  ],
  "minimarkets-del-sur": [
    ["01-conoce-las-tablas", "locales-y-ciudades"],
    ["01-conoce-las-tablas", "categorias"],
    ["02-filtrar", "lacteos-caros"],
    ["02-filtrar", "productos-de-queso"],
    ["02-filtrar", "locales-del-sur"],
    ["03-ordenar-y-limitar", "productos-mas-caros"],
    ["03-ordenar-y-limitar", "ventas-mas-grandes"],
    ["04-resumir-con-group-by", "ventas-por-local"],
    ["04-resumir-con-group-by", "ventas-por-medio-de-pago"],
    ["05-filtrar-grupos", "productos-populares"],
    ["05-filtrar-grupos", "locales-con-ticket-alto"],
    ["06-cruzar-tablas", "ventas-por-ciudad"],
    ["06-cruzar-tablas", "top-10-productos"],
    ["07-ventas-por-mes", "ventas-por-mes"],
    ["07-ventas-por-mes", "ranking-de-marzo"],
    ["08-preguntas-de-gerencia", "local-con-menos-ventas-en-marzo"],
    ["08-preguntas-de-gerencia", "ese-local-mes-a-mes"],
    ["08-preguntas-de-gerencia", "categoria-mas-vendida"],
    ["08-preguntas-de-gerencia", "ticket-por-ciudad"],
    ["08-preguntas-de-gerencia", "productos-de-50-unidades"],
  ],
  "clases-de-python": [
    ["01-variables-y-tipos", "variables-y-tipos"],
    ["02-operadores", "operadores"],
    ["03-print-fstrings", "print-fstrings"],
    ["04-errores-comunes", "errores-comunes"],
    ["05-listas", "listas"],
    ["06-diccionarios", "diccionarios"],
    ["07-tuplas", "tuplas"],
    ["08-listas-anidadas", "listas-anidadas"],
    ["09-if-else", "if-else"],
    ["10-for", "for"],
    ["11-while", "while"],
    ["12-funciones", "funciones"],
    ["13-series", "series"],
    ["14-dataframe", "dataframe"],
    ["15-explorar-dataframe", "explorar-dataframe"],
    ["16-cargar-csv-excel", "cargar-csv-excel"],
    ["17-seleccionar-columnas", "seleccionar-columnas"],
    ["18-loc-iloc", "loc-iloc"],
    ["19-filtros-booleanos", "filtros-booleanos"],
    ["20-crear-columnas", "crear-columnas"],
    ["21-apply", "apply"],
    ["22-limpieza-texto", "limpieza-texto"],
    ["23-fechas", "fechas"],
    ["24-ordenar", "ordenar"],
    ["25-groupby", "groupby"],
    ["26-agg", "agg"],
    ["27-value-counts", "value-counts"],
    ["28-merge", "merge"],
    ["29-valores-nulos", "valores-nulos"],
    ["30-duplicados", "duplicados"],
    ["31-exportar-resultados", "exportar-resultados"],
    ["32-visualizacion-datos", "visualizacion-datos"],
    ["33-python-vs-excel-sql", "python-vs-excel-sql"],
    ["34-proyecto-final-pandas", "proyecto-final-pandas"],
  ],
  "tienda-online-pewen": [
    ["01-de-la-planilla-a-python", "totales-del-carrito"],
    ["01-de-la-planilla-a-python", "primera-tabla"],
    ["02-cargar-y-explorar", "explorar-pedidos"],
    ["03-filtrar-y-seleccionar", "devueltos"],
    ["03-filtrar-y-seleccionar", "envios-grandes"],
    ["04-limpiar", "limpiar-pedidos"],
    ["05-agrupar-y-resumir", "mejores-clientes"],
    ["06-cruzar-tablas", "ventas-por-categoria-y-region"],
    ["07-detectar-patrones", "devoluciones-y-meses"],
    ["08-revisar-el-codigo-de-la-ia", "corregir-codigo-ia"],
    ["09-recomendaciones-para-el-negocio", "cinco-respuestas"],
  ],
  "clinica-cordillera-central": [
    ["01-la-pregunta-del-dashboard", "ficha-del-dashboard"],
    ["02-preparar-los-datos", "atenciones-con-nombres"],
    ["02-preparar-los-datos", "control-por-tipo"],
    ["03-calcular-indicadores", "tasa-de-inasistencia"],
    ["03-calcular-indicadores", "espera-por-sede"],
    ["04-elegir-el-grafico", "serie-mensual-de-urgencias"],
    ["04-elegir-el-grafico", "ranking-de-inasistencia"],
    ["05-disenar-el-dashboard", "boceto-del-dashboard"],
    ["06-construir-el-dashboard", "dashboard-publicado"],
    ["07-presentar-en-cinco-minutos", "presentacion-al-directorio"],
  ],
};

export async function registrarse(page: Page, nombre: string): Promise<string> {
  const email = `ruta-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await cerrarBienvenida(page);
  return email;
}

// Aprueba misiones por la API, en orden, como si se hubieran resuelto en la página.
export async function aprobar(page: Page, ip: string, caso: string, misiones: [string, string][]) {
  for (const [mision, tarea] of misiones) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso, mision, tarea, aprobada: true },
    });
    expect(respuesta.ok(), `${caso}/${mision}`).toBe(true);
  }
}

// Las clases no tienen entregable: se completan al aprobar todas sus lecciones.
export const CLASES = new Set(["clases-de-excel", "clases-de-sql", "clases-de-python", "clases-de-power-bi", "clases-de-ia-para-datos"]);

// Completa un caso entero: todas sus misiones y, si es un caso, el entregable aprobado por administración.
export async function completarCaso(page: Page, admin: Page, ip: string, email: string, caso: string) {
  await aprobar(page, ip, caso, MISIONES[caso]);
  if (CLASES.has(caso)) return;
  await page.goto(`/casos/${caso}`);
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill(`https://github.com/e2e/${caso}`);
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  // Se aprueba por la API de revisión, con 2 en las tres dimensiones: es más rápido y no depende de que la página
  // hidrate. La revisión con clics en la rúbrica la prueba recorrido.spec.
  // La lista se pagina y la base de e2e acumula entregables: se busca el de esta persona.
  await admin.goto(`/profesor/entregables?q=${encodeURIComponent(email)}`);
  const tarjeta = admin.locator("li", { hasText: email });
  await expect(tarjeta).toHaveCount(1);
  const entregableId = await tarjeta.locator("[data-entregable-id]").getAttribute("data-entregable-id");
  expect(entregableId, `${caso}: entregable sin id`).not.toBeNull();
  const respuesta = await admin.request.post(`/api/revision/entregables/${entregableId}`, {
    headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
    data: { puntajes: { claridad: 2, ejecucion: 2, coherencia: 2 }, observaciones: {}, comentario: null },
  });
  expect(respuesta.ok(), `${caso}: aprobación de entregable`).toBe(true);
}

export { entrarComoAdmin };
