# syntaxError.cl v2

Academia gratuita para conseguir tu primer trabajo en tecnología. Spec: `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md`.

## Requisitos

Solo Docker (con Compose v2.24+) y npm. Todo lo demás corre en contenedores.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta todo (Postgres, Redis, Mailpit, migraciones y seed, web y worker) y muestra los logs. Ctrl+C sale de los logs; los servicios siguen arriba |
| `npm run stop` | Baja todo y conserva los datos |
| `npm run reset` | Baja todo y borra los datos (base, `node_modules`) |
| `npm test` | Tests unitarios y de integración contra `postgres-test` |
| `npm run test:e2e` | Tests end-to-end con Playwright contra el build de producción (`next build` + `next start`, con la CSP real y las páginas estáticas): es la verificación que vale para publicar. Al terminar deja `web` en modo desarrollo. Para correr solo algunas pruebas: `npm run test:e2e -- tests/despachos.spec.ts` |
| `npm run test:e2e:dev` | Los mismos tests contra `next dev`, para depurar una prueba mientras se edita el código: `npm run test:e2e:dev -- npx playwright test tests/despachos.spec.ts`. La suite completa en este modo falla al azar porque `next dev` compila cada página al vuelo y con 3 navegadores en paralelo se satura. `e2e/calentar.ts` y `onDemandEntries` en `next.config.ts` lo reducen, pero no lo eliminan |
| `npm run sh` | Shell dentro del contenedor de herramientas (`pnpm`, `tsc`, etc.) |
| `npm run db:generate` | Genera una migración Drizzle a partir de `packages/db/src/schema.ts` |
| `npm run content:validate` | Valida `content/`: schemas, tareas prácticas, briefs, entregable declarado y que cada solución pase su motor |

## URLs locales

- Sitio: http://localhost:3000 (admin: `admin@local.test` / `admin123456`)
- Emails (Mailpit): http://localhost:8025
- Worker: http://localhost:4001/health

## Agregar un paquete al monorepo

Agrega su volumen `node_modules` en `x-node.volumes` de `docker-compose.yml` y en `volumes:`. Luego corre `docker compose run --rm tools pnpm install`.

## Escribir un caso

Un caso es contenido, no código:

```text
content/
  rutas/<ruta>.yaml
  casos/<caso>/
    caso.yaml
    datos/<tabla>.csv
    misiones/<mision>.mdx
```

Bloques disponibles: `Brief`, `Concepto`, `SqlEjemplo`, `PythonEjemplo`, `SqlTask`, `SheetTask`, `PythonTask`, `Decision` y `Debrief`. El caso `content/casos/demo-motor` usa todos.

- En desarrollo se ven también las rutas en `borrador` (`CONTENT_INCLUDE_DRAFTS=true`).
- `db-setup` sincroniza rutas y casos con la base en cada `npm run dev`.
- El build de `web` corre `content:validate` primero y falla si algo no cumple.
- El validador ejecuta soluciones de Python con Pyodide y descarga pandas desde jsDelivr la primera vez, así que necesita red.

## Emails, cuenta y certificados

- Los emails los manda el worker desde la cola `emails` (BullMQ). En local salen por SMTP a Mailpit: ábrelos en http://localhost:8025. En producción, con `RESEND_API_KEY`, salen por la API de Resend.
- Al registrarse llega un email para confirmar la cuenta. En `/perfil` se cambia el nombre, el email (con confirmación desde el correo nuevo) y la contraseña, se descargan los datos y se elimina la cuenta.
- Al completar un caso (todas sus misiones y el entregable) se emite su certificado; al completar todos los casos de una ruta, el de la ruta. Se ven en `/certificados/<código>`, se imprimen o guardan en PDF desde el navegador y cualquiera los verifica en `/verificar/<código>`, que también busca los certificados migrados de la v1.
- El portafolio público (`/p/<usuario>`) parte apagado. Cada alumna lo publica desde su perfil.

## Tutor IA

- En cada misión, `Preguntar al tutor` responde con el contexto de esa misión: encargo, conceptos, tareas y tablas, nunca las soluciones. Explica y da pistas, no resuelve.
- Con `GEMINI_API_KEY` en `.env` responde Gemini (`gemini-flash-lite-latest`, se cambia con `GEMINI_MODEL`). Sin clave, en local responde un proveedor de prueba (`TUTOR_PRUEBA=true`, ya puesto en `docker-compose.yml`). En producción va la clave y no `TUTOR_PRUEBA`.
- Las preguntas pasan por la cola `tutor` del worker, que responde por socket.io (`CHAT_SOCKET_SECRET` debe ser el mismo en web y worker). Si el socket no conecta, el navegador consulta la respuesta cada 4 segundos.
- Las respuestas se guardan en caché por misión (pgvector): la misma pregunta con otras palabras no gasta otra llamada. Límite: 10 preguntas por minuto por alumna.

## Comunidad

- **Puntos y niveles:**
  - 10 por misión aprobada, 50 por caso completo y 5 por acertar una decisión en la primera respuesta;
  - cada logro suma una sola vez;
  - se sube de nivel cada 100 puntos.
- **Preguntas a docentes:**
  - En cada misión, `Preguntar a un docente` envía la pregunta al docente de la clase del estudiante, si tiene ese caso habilitado. Si no, va a administración.
  - Aviso por email (cola `emails`) y en vivo por socket.io (cola `avisos`, sala `usuario:<id>`).
- **Clases:**
  - Un docente crea la clase desde `/profesor` con una ruta del catálogo y comparte el código de 6 caracteres.
  - Cada estudiante se une en `/dashboard/clases` y el docente acepta cada solicitud.
- **Acceso docente:**
  - Se pide desde `/perfil` y lo aprueba administración: la pantalla llega en la Fase 3c2.
  - En local, `admin@local.test` (clave `admin123456`) ya es admin y puede usar todo lo docente.
- **Reseñas:** quien completa un caso puede dejar de 1 a 5 estrellas y un comentario. El comentario queda oculto hasta que administración lo aprueba.
- **Reportes y mensajes:**
  - `Reportar un problema`, en el pie de página, guarda la página desde donde se envió y avisa a administración por email.
  - Los mensajes internos se leen en `/dashboard/mensajes`.
- **Permisos:** el rol se lee desde la base en cada request, no desde la sesión: un cambio de rol rige al instante y una cuenta eliminada pierde el acceso aunque tenga la sesión abierta en otro dispositivo.

## Administración

- **Panel:** vive en `/admin` y solo entra el rol `admin` (a otros roles les responde 404). En local, `admin@local.test` con clave `admin123456`.
- **Usuarios:** permite buscar, cambiar rol y eliminar una cuenta por solicitud ARCO, confirmando con su email. Nadie cambia su propio rol ni elimina su propia cuenta desde el panel.
- **Sesiones:** cada `auth()` revisa la cuenta en la base. Si administración elimina la cuenta, la sesión se cierra en todos sus dispositivos, y un cambio de rol rige al instante.
- **Contenido:** muestra casos, rutas, inscripciones y métricas por misión: personas que iniciaron/aprobaron, intentos promedio, abandono tras 14 días sin avance y primera tarea pendiente.
- **Comunidad:** aprueba solicitudes docentes, modera comentarios de reseñas y resuelve reportes. Un error real de un caso suma 25 puntos a quien lo reportó.
- **Preguntas y tutor:** supervisa preguntas a docentes y al tutor, y permite borrar respuestas malas de la caché del tutor.
- **Bitácora:** registra acciones de administración con quién actuó, IP, destino y detalle; se filtra por acción y email.

## Plataforma

- **Buscador:** `/buscar` busca rutas, casos y misiones publicadas en el encargo, los conceptos y los enunciados, sin distinguir mayúsculas ni tildes. El índice se arma en el build desde `content/` y nunca incluye soluciones, pruebas ni el cierre de las misiones.
- **Continuar donde quedé:** el panel lleva a la misión en curso más reciente o a la siguiente pendiente. Si el caso solo necesita el entregable, lleva a la página del caso.
- **Limpieza diaria (worker, cola `mantenimiento`):** borra la bitácora y las preguntas al tutor con más de `RETENCION_BITACORA_DIAS` días (365 por defecto, mínimo 30). Los registros de derechos ARCO no se borran.
- **SEO:** `robots.txt` deja fuera las páginas privadas y `sitemap.xml` lista el contenido publicado.
- **Sentry:** se enciende con `NEXT_PUBLIC_SENTRY_DSN` (web) y `SENTRY_DSN` (worker); sin ellas queda apagado. Muestrea el 10 % de las trazas, no envía datos personales y sube sourcemaps en el build solo si defines `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN`.

## Recorrido y ayudas

Se basa en la propuesta pedagógica aprobada (`docs/propuesta-pedagogica-data-analyst.md`).

- **Orden obligatorio:**
  - La tarea de una misión se habilita al aprobar la anterior, y un caso al completar el caso anterior de su ruta.
  - Todo se puede leer; lo que se bloquea es resolver.
  - El servidor rechaza con 409 los intentos fuera de orden.
- **Primero intentar:**
  - La primera pista aparece tras 2 intentos fallidos de la tarea y luego una por intento.
  - El tutor IA se habilita tras 5 intentos fallidos en la misión.
  - Un intento fallido es un resultado incorrecto. Un error de código (`errorDeCodigo` en `ResultadoTarea`) se explica al instante y no cuenta.
  - Los umbrales están en `apps/web/src/lib/progreso/ayudas.ts`.
- **Misión sin guía:**
  - `sinGuia: true` en el frontmatter.
  - Sin concepto, ejemplos ni pistas.
  - El validador exige que la última misión de todo caso de una ruta publicada lo sea.
- **Entregables:**
  - Deben ser un repositorio de GitHub.
  - Al enviarlo se verifica que sea público, tenga README y los archivos de `archivos` en `caso.yaml`.
  - Luego un docente de la clase, o administración, lo revisa en `/profesor/entregables` con la rúbrica estándar (`packages/content/src/rubrica.ts`).
    - Tiene tres dimensiones (claridad, ejecución técnica y coherencia), cada una con puntaje de 1 (Insuficiente) a 3 (Destacado).
    - `rubrica` en `caso.yaml` describe qué se espera en cada dimensión para ese caso, y la página del caso la muestra.
    - La decisión sale de los puntajes (`apps/web/src/lib/entregables/rubrica.ts`): con 2 o más en las tres se aprueba. Con un 1 se piden cambios, esa dimensión necesita un comentario, y la persona corrige y reenvía sin penalización.
  - Al enviarlo se informa el plazo de revisión: 5 días hábiles (`apps/web/src/lib/entregables/plazo.ts`).
  - Solo un entregable aprobado completa el caso y emite el certificado.
  - En local y en e2e, `ENTREGABLES_VERIFICACION=prueba` evita consultar GitHub (un repositorio con `vacio` en el nombre simula uno sin README).
  - En producción conviene definir `GITHUB_TOKEN`.

## Consolas

Se basan en la sección 10 de la propuesta pedagógica: que escribir código acompañe y no intimide.

- **Editor** (`apps/web/src/components/consola/`):
  - CodeMirror 6, que carga después de la página: mientras tanto, o si la conexión falla, se usa un `textarea`.
  - Sintaxis coloreada, números de línea, cierre de paréntesis y comillas, y resaltado del par correspondiente.
  - Autocompletado con las tablas y columnas del caso (SQL) o con columnas, archivos, variables y métodos de pandas (Python). `Ctrl+Espacio` lo abre.
  - Explicaciones en español al pasar el mouse (`apps/web/src/lib/consola/glosario.ts`), que también llegan por teclado en las sugerencias.
  - Teclado: `Tab` agrega sangría; `Esc` y luego `Tab` sale del editor.
- **Errores en español** (`packages/engines/src/*-errores.ts`, `sheet-ayuda.ts`):
  - cada error trae mensaje, sugerencia ("¿Quisiste decir…?") y línea marcada en el editor;
  - el mensaje original queda disponible en "Mensaje original";
  - en SQL, además, hay avisos de lo que alasql deja pasar en silencio: columnas mal escritas o textos sin comillas.
- **Python:** después de ejecutar se muestran las tablas de pandas que quedaron en variables (hasta 5, con sus primeras 10 filas).
- **Planilla:** ayuda de la función mientras se escribe la fórmula, sugerencias de funciones y explicación del error de la celda.
- **Regla:** una explicación explica el error, nunca entrega la solución de la tarea.
- **Rutas futuras:** las consolas comparten un contrato común. Ver `packages/engines/README.md` para agregar una nueva (terminal, registros, desarrollo web).

## Caso 0: Herramientas del oficio

- **Lo primero de la ruta:** es el primer caso de `data-analyst` y se hace completo desde la web de GitHub.
- **Dos tipos de tarea propios:**
  - `MarkdownTask`: se escribe Markdown con vista previa y se revisa en el navegador.
  - `GithubTask`: revisa el repositorio real de la persona por la API de GitHub (`POST /api/github/revisar`, 20 revisiones cada 10 minutos por IP).
- **Requisitos de una `GithubTask`:**
  - `publico`, `readme`, `nombres-limpios`;
  - `commits:N`: mensajes escritos por la persona, no los automáticos de GitHub;
  - `carpeta:x`, `extension:.ext`;
  - `readme:<requisito de Markdown>`, por ejemplo `readme:subtitulos:2`.
- **Configuración:**
  - En producción, define `GITHUB_TOKEN`: sin token, GitHub permite 60 consultas por hora para todo el servidor.
  - En local y en e2e, `ENTREGABLES_VERIFICACION=prueba` evita llamar a GitHub: el usuario `no-existe` simula una cuenta inexistente.
- **El caso demo** (`demo-motor`) vive en la ruta `demo`, en borrador: lo usan las pruebas y nunca se publica.

## Caso 1: Despachos Rápidos

- **Datos generados:** los CSV de `content/casos/despachos-rapidos/datos/` salen de `packages/content/src/generadores/despachos-rapidos.ts`, con semilla fija.
  - Para cambiarlos: edita el generador, corre `docker compose run --rm tools pnpm --filter @syntaxerror/content generar` y actualiza los valores esperados de las tareas.
  - Una prueba falla si los CSV se editan a mano.
- **Defectos a propósito:** `despachos.csv` trae comunas mal escritas, fechas como texto, costos vacíos y filas duplicadas, en posiciones fijas (`DEFECTOS`). `despachos_limpios.csv` es la versión corregida que usan las misiones 6 a 9.
- **Planilla:**
  - Una `SheetTask` puede consultar otras hojas (`otras`), traer celdas escritas de antemano (`inicial`) y resolver columnas completas con rangos en la solución (`"I2:I63": "=G2*(1+$K$2)"`).
  - En la misión se ven pestañas, el botón "Rellenar hasta la fila..." y las fechas como DD/MM/AAAA.

## Caso 2: Minimarkets del Sur

- **Datos generados:** `packages/content/src/generadores/minimarkets-del-sur.ts`, con semilla fija.
  - 8 locales, 36 productos y 650 ventas de enero a marzo de 2025.
  - Están limpios a propósito: el caso trata de preguntar bien.
  - La historia que esconden: en marzo Osorno Centro vende un tercio de lo normal (remodelación) y la Kombucha artesanal nunca se vendió. Una prueba falla si un cambio en el generador borra esa historia.
- **Tareas SQL:** no llevan valores escritos a mano; el resultado esperado se calcula desde la solución. Toda tarea con `ORDER BY` + `LIMIT` que tenga empates en el corte pide el desempate en su enunciado.
- **e2e:** `e2e/tests/progreso.ts` completa los casos anteriores (misiones y entregable aprobado). Cada caso nuevo agrega ahí sus misiones.

## Caso 3: Tienda Online Pewen

- **Datos generados:** `packages/content/src/generadores/tienda-online-pewen.ts`, con semilla fija.
  - 90 clientes, 24 productos y 424 pedidos de julio a diciembre de 2025.
  - Defectos para limpiar con pandas: 4 pedidos duplicados, 5 sin cantidad y 6 clientes sin región.
  - Patrones para descubrir: Vestuario se devuelve en un 23 % de sus pedidos y noviembre (Black Friday) vende más del doble que un mes normal.
- **Tareas de Python:** sus `pruebas` comparan valores calculados con los datos generados, con mensajes que orientan sin dar la solución. El validador ejecuta cada solución con pandas en Pyodide.
  - Desde la misión 5, la `preparacion` incluye la limpieza de la misión 4.
  - La misión 9, sin guía, parte de los archivos sin limpiar.
- **Entregable:** un notebook (`.ipynb`, por ejemplo hecho en Google Colab) con el análisis y las recomendaciones.

## Caso 4: Clínica Cordillera Central

- **Datos generados:** `packages/content/src/generadores/clinica-cordillera-central.ts`, con semilla fija.
  - 4 sedes, 8 especialidades y 1200 atenciones de enero a junio de 2025, sin ningún dato de pacientes.
  - Lo que el dashboard tiene que mostrar: en invierno la espera en urgencia se duplica (en Maipú llega a 129 minutos en junio, con todos los abandonos) y Dermatología tiene 21 % de inasistencia.
- **Dentro y fuera de la plataforma:**
  - Dentro se resuelven la ficha y el boceto (`MarkdownTask`), los datos e indicadores (`SqlTask`) y el criterio (decisiones).
  - El dashboard se construye en Power BI Desktop (Windows) o Looker Studio (navegador) y se entrega en GitHub con capturas: `GithubTask` verifica el repositorio y la rúbrica evalúa el dashboard.

## Caso 5: Proyecto final

- **Datos de la persona:** elige un conjunto de una lista curada de seis fuentes (datos.gob.cl, INE, SINIM, DEIS, Centro de Estudios Mineduc y SINCA). La plataforma no puede correr su análisis: lo verifican `GithubTask` (repositorio, carpetas, notebook, gráficos y README) y la rúbrica de tres dimensiones.
- **Muestra de práctica:** `packages/content/src/generadores/proyecto-final.ts` genera la matrícula escolar del Maule 2020–2024 (números inventados) con el formato de un portal público: separador `;`, miles con punto, `s/i` y filas de «Total regional» mezcladas con el detalle. Con ella se practica leer el archivo, revisar el análisis de una IA contra el total de control y calcular una variación por comuna.

## Datos de los casos

- Cada caso con datos muestra "Datos del caso" en su página, con enlaces para descargar sus CSV: `/casos/<caso>/datos/<tabla>.csv`.
- Los CSV van en UTF-8, separados por coma y sin BOM. En Excel se abren con Datos → Obtener datos → Desde texto/CSV.
  - La excepción es la muestra del proyecto final: imita un archivo público, separado por punto y coma. Su generador entrega el texto del archivo tal cual.
- Las rutas se generan en el build, solo para los casos publicados.
