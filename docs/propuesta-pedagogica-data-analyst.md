# Propuesta de enseñanza: ruta Data Analyst (versión 2)

**Estado:** versión 2, que incorpora el diagnóstico del equipo. Se espera la revisión final del equipo antes de escribir el contenido.

**Qué cambió respecto a la versión 1:**
- La ruta tiene un orden obligatorio para certificar: nadie se salta un aprendizaje.
- Las pistas y el tutor IA aparecen después de intentar, no antes.
- Cada caso termina con una misión sin guía que demuestra lo aprendido.
- Excel va antes que SQL.
- Se suma un caso transversal, "Herramientas del oficio", que enseña GitHub.
- Los entregables se verifican (automáticamente y con rúbrica) antes de emitir el certificado.
- Power BI se mantiene, con Looker Studio como alternativa 100 % web.
- Se definen consolas de trabajo más amables: sintaxis coloreada, autocompletado y errores explicados en español.
- Queda explícito que la plataforma recibirá otras rutas, aunque hoy se construye solo para Data Analyst.

---

## 1. La idea en una frase

Se aprende haciendo el trabajo real. En cada curso, la persona llega como **analista de datos junior** a una empresa chilena ficticia, recibe encargos de su jefatura y los resuelve con datos, directo en el navegador. Al terminar se lleva algo concreto y verificado para su portafolio.

## 2. Principios

1. **Aprender de verdad, no aparentar que se aprendió.** El certificado solo se obtiene recorriendo todo el camino, en orden y resolviendo cada tarea. No hay atajos para certificarse.
2. **La frustración es parte del aprendizaje, pero debe ser productiva.** Luchar con un problema difícil y alcanzable consolida el aprendizaje; perderse por una explicación mala o por falta de base solo desmotiva. Por eso cada misión es exigente, pero enseña antes todo lo que pide.
3. **Estricto para certificar, flexible para explorar.** Cualquiera puede leer cualquier misión para curiosear. Lo que exige orden es practicar, aprobar y certificarse.
4. **Primero intentar, después pedir ayuda.** La ayuda existe, pero llega cuando la persona ya se enfrentó al problema.
5. **Evidencia por sobre asistencia.** Lo que vale ante un reclutador es un portafolio verificable, no un certificado de horas.
6. **Sin barreras de entrada.** No se instala nada: todo corre en el navegador, incluso con computadores modestos.
7. **Aprender tiene que ser agradable.** Las herramientas acompañan, con colores, sugerencias y errores explicados en español.

## 3. Cómo está organizado el contenido

```
Ruta (un cargo: Analista de datos junior)
 └─ Caso (un curso: una empresa, un problema, un entregable)
     └─ Misión (una sesión de 10 a 30 minutos, con un encargo concreto)
         └─ Bloques (encargo, concepto, ejemplo, tarea, decisión, cierre)
```

- **Ruta:** apunta a un cargo real y reúne sus casos en un orden fijo. Al completarlos todos, se obtiene el certificado de la ruta.
- **Caso:** equivale a un curso. Tiene una empresa, un contexto, sus propios datos y un entregable final. Dura unas 3 a 5 horas.
- **Misión:** un encargo acotado que se resuelve en una sentada. Cada caso tiene de 6 a 10 misiones, y la última es siempre una misión sin guía.
- **Clases** (decisión del 2026-10-02): antes del caso que las aplica, una lección por tema, paso a paso y con datos de práctica simples. Es el material de las aulas de la v1, convertido al formato de la v2: una lección es una misión sin encargo, con concepto, ejemplos y un ejercicio validado. Las clases no tienen entregable ni certificado propio; se completan al aprobar todas sus lecciones y habilitan el caso siguiente. El orden queda: Caso 0, **clases de Excel**, Caso 1, **clases de SQL**, Caso 2, y así con cada herramienta. Las lecturas de las aulas (una pregunta para pensar, sin ejercicio) se traen como lecciones que se completan al marcarlas, igual que en la v1.

## 4. Cómo es una misión

Cada misión sigue el mismo recorrido, para que la persona sepa siempre qué esperar:

| Paso | Bloque | Qué ve la persona | Para qué sirve |
|---|---|---|---|
| 1 | **Encargo** | Un mensaje de alguien de la empresa pidiendo algo | Da contexto y propósito |
| 2 | **Concepto** | Una explicación breve de lo que necesita | Enseña lo justo para el encargo |
| 3 | **Ejemplo** | Un ejemplo que se puede ejecutar y modificar | Permite probar antes de hacer |
| 4 | **Tarea** | Un ejercicio práctico que se corrige solo | Es la práctica central: la misión se aprueba al resolverlo |
| 5 | **Decisión** | Una pregunta de criterio con varias opciones y su explicación | Entrena el juicio profesional |
| 6 | **Cierre** | Qué se aprendió y cómo aparece en una entrevista | Consolida y conecta con el empleo |

**Repaso intercalado:** desde la tercera misión de cada caso, al menos una tarea reutiliza algo de misiones anteriores. Si alguien pasó una misión sin entenderla, se nota más adelante y tiene que volver a repasar.

**Ejemplo real (ya funciona en la plataforma):**
1. **Encargo:** Paula, jefa comercial de una distribuidora, pide la lista de clientes de regiones para una campaña.
2. **Concepto:** cómo filtrar filas con `WHERE`.
3. **Tarea:** escribir la consulta. Si trae filas de más, el sistema responde "Tu consulta trae 6 filas, se esperan 4".
4. **Decisión:** Paula agrega "solo los clientes activos", pero no hay ninguna columna que lo diga. ¿Qué haces? La respuesta correcta es preguntarle qué entiende por "activo".
5. **Cierre:** cómo preguntan esto en una entrevista y cuál es el error más común.

## 5. La misión final sin guía

Cada caso termina con un encargo nuevo, **sin concepto, sin ejemplo y sin pistas**, que obliga a combinar todo lo aprendido en el caso. Por ejemplo: "Gerencia necesita saber qué local vendió menos en marzo y por qué; prepara el informe".

- Es obligatoria para completar el caso.
- El tutor IA sigue disponible, pero solo después de varios intentos, y con la instrucción de hacer preguntas en vez de indicar el camino.
- Es la prueba de que la persona aprendió, y no solo de que siguió instrucciones.

## 6. Ayuda: primero intentar

| Ayuda | Cuándo aparece | Qué entrega |
|---|---|---|
| **Error explicado** | Siempre, al instante | Qué falló, en español, y la línea donde ocurrió |
| **Primera pista** | Después de 2 intentos fallidos | Una orientación general sobre la lógica o la función |
| **Segunda pista** | Después de 3 intentos fallidos | Una orientación concreta sobre la sintaxis o la estructura |
| **Siguientes pistas** | Una por cada intento fallido adicional | Más concretas; la última nunca entrega la respuesta |
| **Tutor IA** | Después de 5 intentos fallidos en la misión | Diagnóstico guiado con preguntas que llevan a la solución, nunca la solución |
| **Docente** | Siempre | Una respuesta humana, por email y en la plataforma |

Un **intento fallido** es un resultado incorrecto: la consulta corre pero trae otras filas, la celda muestra otro valor o una prueba no pasa. Un error de código (de sintaxis, un nombre mal escrito o una fórmula con error) no cuenta como intento: la consola lo explica al instante, en español. Así las pistas y el tutor llegan cuando la persona se equivoca en el razonamiento, no cuando se le escapa una coma.

Las pistas y el tutor no penalizan: usarlos no resta puntos. Lo que se busca es que la persona intente primero.

## 7. Orden de la ruta y prerrequisitos

**Dentro de un caso:** la tarea de una misión se habilita cuando se aprueba la anterior. Se puede leer lo que viene, pero no resolverlo.

**Entre casos:** cada caso se habilita al completar el anterior. El orden es:

| # | Caso | Por qué va en este lugar |
|---|---|---|
| 0 | **Herramientas del oficio** (GitHub, portafolio) | Todos los entregables viven en GitHub: hay que enseñarlo antes de pedirlo |
| 1 | **Planillas** (Excel) | Es la herramienta más familiar: filas, columnas, filtros y resúmenes, en una interfaz visual |
| 2 | **SQL** | Lo que se vio en planillas (filtrar, agrupar, cruzar tablas) se traduce a `WHERE`, `GROUP BY` y `JOIN` |
| 3 | **Python con pandas** | Automatiza y escala lo aprendido en planillas y SQL |
| 4 | **Visualización** (Power BI o Looker Studio) | Comunica lo analizado con indicadores y dashboards |
| 5 | **Proyecto final** | Integra todo, con datos públicos reales |

Quien ya domina una herramienta igual recorre el caso, pero lo hará rápido. Una prueba para saltarse casos queda fuera por ahora: podría servir para atajar el camino, y va contra el principio 1.

## 8. Los casos

Cada caso usa una empresa distinta, para que el portafolio muestre variedad de industrias. Todas son chilenas y ficticias, con datos realistas en pesos chilenos, comunas y regiones.

### Caso 0: Herramientas del oficio (transversal)

- **Qué enseña:** competencias para trabajar en tecnología, no de nivel desarrollador:
  1. Qué es un repositorio y por qué los equipos de TI trabajan así.
  2. Crear la cuenta de GitHub y el primer repositorio.
  3. Escribir un buen README en Markdown: títulos, listas, tablas e imágenes.
  4. Subir archivos y entender qué es un commit y su mensaje.
  5. Organizar un proyecto: carpetas, nombres de archivo y datos.
  6. Armar el perfil y fijar los proyectos del portafolio.
  7. Misión sin guía: publicar un repositorio de presentación personal.
- **Cómo se hace:** todo desde la web de GitHub, sin instalar nada ni usar la terminal. Git por terminal corresponde a las rutas de desarrollo y de Cloud/DevOps.
- **Entregable:** un repositorio de presentación personal, verificado automáticamente.
- **Por qué es transversal:** se escribe una vez y formará parte de todas las rutas futuras.

### Caso 1: Planillas, "Despachos Rápidos"

- **Cargo:** analista junior en una pyme de despachos a domicilio.
- **Herramienta:** planilla en el navegador, con fórmulas en español como en Excel.
- **Misiones:**
  1. Leer y ordenar una planilla desordenada.
  2. `SUMA`, `PROMEDIO` y `CONTAR`.
  3. Condiciones: `SI`, `CONTAR.SI` y `SUMAR.SI`.
  4. Buscar en otra tabla: `BUSCARV` y `BUSCARX`.
  5. Limpiar datos: textos, fechas, duplicados y errores.
  6. Resumir con tablas dinámicas.
  7. Indicadores: tiempos de entrega y costos por comuna.
  8. Misión sin guía: un resumen para la dueña.
- **Entregable:** la planilla del análisis en GitHub, con una hoja de conclusiones y un README.

### Caso 2: SQL, "Minimarkets del Sur"

- **Cargo:** analista junior en una cadena de minimarkets con locales en varias regiones.
- **Herramienta:** SQL en el navegador.
- **Misiones:**
  1. Conocer las tablas: `SELECT`.
  2. Filtrar: `WHERE`, `AND`, `OR` y `LIKE`.
  3. Ordenar y limitar: el top 10 de productos.
  4. Resumir con `GROUP BY` (como en la tabla dinámica del caso 1).
  5. Filtrar grupos: `HAVING`.
  6. Cruzar tablas: `JOIN` (como en el `BUSCARV` del caso 1).
  7. Fechas: ventas por mes.
  8. Misión sin guía: cinco preguntas de gerencia.
- **Entregable:** un repositorio con las consultas y un README con los hallazgos.

### Caso 3: Python con pandas, "Tienda Online Pewen"

- **Cargo:** analista junior en un e-commerce de artículos para el hogar.
- **Herramienta:** Python con pandas en el navegador.
- **Misiones:**
  1. De la planilla a Python: variables, listas y la primera tabla.
  2. Cargar y explorar datos.
  3. Filtrar y seleccionar.
  4. Limpiar: nulos, tipos y duplicados.
  5. Agrupar y resumir.
  6. Cruzar tablas (`merge`).
  7. Detectar patrones.
  8. Misión sin guía: recomendaciones para el negocio.
- **Entregable:** un script o notebook en GitHub con sus conclusiones.

### Caso 4: Visualización, "Clínica Cordillera Central"

- **Cargo:** analista junior en el área de gestión de una clínica.
- **Herramientas:** en la plataforma, SQL y planilla para preparar los datos. Fuera de ella, Power BI Desktop, o Looker Studio como alternativa.
- **Sobre Power BI:**
  - Power BI Desktop es gratuito, pero solo funciona en Windows.
  - Publicarlo en la web exige una cuenta de trabajo o de estudiante con licencia.
  - Por eso se ofrecen dos caminos equivalentes:
    - **Con Windows (recomendado):** Power BI Desktop, por su alta demanda laboral. Se entrega el archivo `.pbix` en GitHub, con capturas o un video corto.
    - **Con Mac, Linux o sin poder instalar:** Looker Studio, gratuito y 100 % web. Se entrega el enlace público del dashboard y capturas en GitHub.
- **Misiones:**
  1. Qué pregunta responde un dashboard: indicadores y audiencia.
  2. Preparar los datos: tablas de hechos y dimensiones.
  3. Calcular indicadores.
  4. Elegir el gráfico correcto.
  5. Diseñar: jerarquía, filtros y colores.
  6. Construir en Power BI o Looker Studio, con una guía paso a paso para cada uno.
  7. Misión sin guía: presentar el dashboard en cinco minutos.
- **Entregable:** el dashboard y su explicación, en GitHub.

### Caso 5: Proyecto final, "Tu propio análisis"

- **Datos:** un conjunto de datos abiertos chilenos elegido de una lista curada de seis fuentes: datos.gob.cl, INE, SINIM (SUBDERE), DEIS (MINSAL), Centro de Estudios Mineduc y SINCA (calidad del aire).
- **Misiones:** elegir la pregunta, explorar y limpiar, analizar, visualizar, escribir conclusiones y limitaciones, y publicar.
- **Entregable:** un proyecto completo en GitHub. Es la pieza principal del portafolio.

### IA aplicada, como hilo transversal

La IA no es un curso aparte. En los casos 1, 3 y 5 hay una misión de "IA para analizar datos": usar un asistente para escribir una fórmula o una consulta, **verificar** su respuesta y detectar cuándo se equivoca. Un curso aislado de "prompts" queda obsoleto rápido; saber auditar lo que produce la IA, no.

## 9. Cómo se evalúa y se certifica

- **Aprobar una misión:** resolver correctamente todas sus tareas. Se puede intentar cuantas veces se quiera, sin penalización.
- **Las decisiones no bloquean:** no cuentan para aprobar, pero la primera respuesta correcta suma puntos.
- **Completar un caso:** aprobar todas sus misiones, incluida la misión sin guía, y tener el entregable verificado.
- **Cómo se verifica el entregable:**
  1. **Verificación automática:** la plataforma revisa en GitHub que el repositorio exista, sea público, tenga un README y contenga los archivos que pide el caso (por ejemplo, un `.sql` o un `.py`). Un enlace vacío no pasa.
  2. **Revisión con rúbrica:** la diseña el equipo interno de syntaxError, con tres dimensiones estándar (claridad del README y la explicación, ejecución técnica del análisis y coherencia de las conclusiones), cada una con puntaje de 1 (Insuficiente), 2 (Aceptable) o 3 (Destacado). Se aprueba con al menos 2 en las tres. Si alguna queda en 1, la persona recibe el comentario puntual de esa dimensión, corrige el repositorio y lo reenvía sin penalización, y pasa de nuevo por la revisión. Revisa la docente de la clase si la persona cursa con un tutor asignado; si cursa de forma autónoma, el equipo de administración, en un plazo de 5 días hábiles. Cuando una cohorte supere los 50 estudiantes activos en un caso, la plataforma podrá pasar a revisión entre pares con la misma rúbrica: hacerla antes dejaría revisiones esperando semanas.
- **Certificado:** verificable en línea, y solo se emite con el caso completo y el entregable aprobado.
- **Puntos y niveles:** 10 por misión, 50 por caso y 5 por acertar una decisión. Motivan, pero no son un requisito.

La corrección automática revisa el **resultado** (que la consulta traiga las filas correctas, que la celda tenga el valor esperado), no que el código sea idéntico a una solución: hay muchas formas válidas de resolver.

## 10. Consolas de trabajo: como nos hubiera gustado aprender

Las herramientas donde se escribe código deben acompañar, no intimidar:

- **Sintaxis coloreada:** palabras reservadas (`SELECT`, `WHERE`, `def`, `import`), textos, números y comentarios, cada uno con su color.
- **Autocompletado del caso:** sugiere los nombres de las tablas y columnas de los datos de ese caso, no una lista genérica.
- **Ayudas de escritura:** números de línea, cierre automático de paréntesis y comillas, y resaltado del par correspondiente.
- **Explicaciones al pasar el mouse:** sobre `GROUP BY` aparece qué hace, en español y con un ejemplo mínimo.
- **Errores en español y con sugerencia:** en vez de `NameError: name 'venta' is not defined`, "No existe nada llamado `venta`. ¿Quisiste decir `ventas`?", con la línea marcada.
- **Resultados que se ven:** en Python, cada tabla de pandas se muestra ordenada, paso a paso; en SQL, la estructura de las tablas del caso siempre a mano.
- **Planillas:** fórmulas en español, con una ayuda de la función mientras se escribe.
- **Accesibles:** se usan con teclado y lectores de pantalla, y funcionan con conexiones lentas (los datos de cada caso son livianos, y Python se descarga una sola vez y queda guardado).

## 11. Tono y estilo

- **Idioma:** español de Chile, tratando de tú, con un tono cercano y profesional. Nada de voseo.
- **Lenguaje:** neutro en género ("te damos la bienvenida", "la persona", "estudiante").
- **Explicaciones:** cortas, al servicio del encargo; la teoría llega justo cuando se necesita.
- **Errores:** son parte del trabajo. El sistema explica qué pasó, sin castigar.
- **Contexto:** chileno de verdad: comunas, regiones, pesos chilenos y situaciones reconocibles.

## 12. Qué se lleva la persona al terminar la ruta

- **Certificados:** 6 de caso (incluido el de "Herramientas del oficio") y 1 de la ruta, todos verificables en línea.
- **Portafolio:** uno público (`syntaxerror.cl/p/<usuario>`), con los entregables verificados y un perfil de GitHub ordenado.
- **Entrevistas:** práctica de preguntas de entrevista en el cierre de cada misión.
- **Criterio:** práctica de cómo actuar ante encargos ambiguos, entrenado en las decisiones.

## 13. Una plataforma para varias rutas, construida hoy para esta

syntaxError.cl recibirá después las rutas de Ciberseguridad, Full Stack y Cloud/DevOps. La lección de la primera versión es no construir para todas a la vez. Por eso:

- **Hoy se construye solo lo que Data Analyst necesita,** y nada más.
- **El camino queda pavimentado para las próximas:**
  - el contenido vive en archivos separados del código, así que una ruta nueva es una carpeta nueva;
  - un caso puede pertenecer a varias rutas, como "Herramientas del oficio";
  - las consolas de trabajo (SQL, planilla, Python) comparten un mismo contrato: ejecutar, validar, mostrar el resultado y explicar el error. Las rutas futuras agregarán las suyas (terminal, registros de seguridad, desarrollo web) enchufándolas, sin rediseñar la plataforma;
  - los principios de este documento (orden, primero intentar, misión sin guía y evidencia verificada) aplican igual a todas las rutas.

## 14. Qué implica en la plataforma

Antes de escribir el contenido, la plataforma necesita una fase corta de ajustes ("Experiencia de aprendizaje"):

1. Orden obligatorio: misiones y casos que se habilitan al completar el anterior.
2. Pistas y tutor IA condicionados a los intentos.
3. El editor nuevo, con sintaxis coloreada, autocompletado, explicaciones y errores en español.
4. La verificación automática de repositorios en GitHub y la revisión con rúbrica.
5. El contrato común de las consolas de trabajo.

La misión sin guía, el repaso intercalado y el caso de GitHub no requieren cambios en la plataforma: son decisiones de cómo se escribe el contenido.

## 15. Decisiones del equipo

Las preguntas abiertas de esta propuesta quedaron resueltas entre el 2026-10-01 y el 2026-10-02:

1. **Empresas de los casos:** Despachos Rápidos, Minimarkets del Sur, Tienda Online Pewen y Clínica Cordillera Central (reemplaza a Clínica Los Andes, que coincide con clínicas reales).
2. **Intentos:** 2 para la primera pista, 3 para la segunda y 5 para el tutor IA. Los errores de código no cuentan como intento (sección 6).
3. **Rúbrica:** tres dimensiones estándar con puntaje de 1 a 3, diseñadas por el equipo interno. Se aprueba con al menos 2 (Aceptable) en las tres; con un 1, se corrige y se reenvía sin penalización. Revisa la docente de la clase o el equipo de administración en 5 días hábiles, y desde 50 estudiantes activos en un caso puede pasar a revisión entre pares (sección 9).
4. **Datasets de la v1:** se reutilizan los que funcionaron bien, pasándolos por el generador reproducible para agregarles defectos reales (vacíos, espacios de más y fechas mezcladas) y sin superar 2 a 3 MB, para que carguen rápido con conexiones lentas.
5. **Datos abiertos del proyecto final:** datos.gob.cl, INE, SINIM, DEIS, Centro de Estudios Mineduc y SINCA (sección 8, Caso 5).
6. **Clases antes de los casos** (2026-10-02): se trae el contenido de las aulas de la v1, no las aulas (sección 3), sin reescribirlo: solo se corrigen tildes y se escriben pistas que orienten sin dar la respuesta. Primero SQL y Excel; después Python, Power BI e IA para datos. Quedan para que el equipo las confirme:
   - **Las clases son obligatorias,** sin una prueba para saltarlas. Esa prueba puede venir después.
   - **Los temas de SQL que no son de análisis** (INSERT, UPDATE, DELETE, CREATE y ALTER TABLE, restricciones, TRUNCATE, vistas, índices, transacciones y elegir motor) no entran al piloto. Si se quieren, irían como clases opcionales.
