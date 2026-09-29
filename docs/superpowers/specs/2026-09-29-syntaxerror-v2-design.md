# syntaxError.cl v2.0

Fecha: 2026-09-29
Repo: `~/Documents/desarrollo/syntaxerror-v2`
Antecesor: `~/Documents/desarrollo/cursos` (v1)

## 1. Por qué una v2

syntaxError es una academia 100% gratuita, operada por una fundación sin fines de lucro. Su objetivo es que los alumnos **consigan su primer trabajo** en tecnología. La v1 no lo está logrando, y su costo operativo sube sin que el uso lo justifique.

### Lo que funcionó en la v1

- **Las aulas prácticas** (SQL, Excel, Python) funcionaron:
  - datos realistas;
  - un motor real que corre en el navegador del alumno (alasql, Pyodide, una planilla propia);
  - validación automática contra una solución de referencia.
- **La identidad visual** (terminal, glitch, tono de marca) es distinta al resto de las academias.
- **La plataforma de comunidad y gestión** es útil y se conserva completa:
  - cuentas, certificados verificables y tutor IA;
  - preguntas al profesor, clases, puntos, reseñas, reportes y mensajes;
  - panel admin, emails, derechos ARCO y bitácora.
- La ruta más usada es **Data Analyst**.

### Lo que no funcionó

- **Las clases son monótonas.**
  - 18 de 29 aulas son una plantilla idéntica: objetivo, 2 párrafos, 3 conceptos, un caso y 3 preguntas.
  - En 700 de 702 preguntas la respuesta correcta es la primera opción.
- **Se promete más de lo que hay.** La home muestra 5 rutas, pero solo hay 15 de 40 aulas publicadas, casi todas de Data y Ciber.
- **Cada curso es una app aparte.**
  - Hay 40 proyectos Vite (`aula-*`) que se compilan, se copian a `apps/web/protected/` y se muestran en un iframe.
  - Producir un curso cuesta lo mismo que producir una app.
- **El costo se dispara por cómo se sirven las aulas.**
  - Railway: jul $33,4, ago $35,5 y sep $40,2 a la fecha.
  - El 90% del gasto es RAM del web: ~4 GB en promedio, picos de 7,8 GB, CPU cerca de 0 y tráfico mínimo.
  - Causa: una route de Next.js lee cada archivo de aula completo en memoria (incluido Pyodide, decenas de MB), ejecuta `auth()` y una consulta a la base por archivo, y responde con `Cache-Control: no-store`.
  - Worker y Redis suman solo ~$3,5 al mes. Las funciones de gestión no consumen RAM relevante.

## 2. Objetivo

Que un alumno termine una ruta con **evidencia contratable**: casos de trabajo resueltos con herramientas reales y un portafolio público. Todo con un costo operativo bajo $12 al mes y un costo de producción por curso mucho menor que en la v1.

## 3. Principios

1. **La práctica es la clase.** Ninguna misión es solo lectura.
2. **El cómputo lo pone el navegador del alumno.** Los motores corren client-side. El servidor guarda progreso y gestiona la comunidad.
3. **Un motor, muchos cursos.** Un curso se escribe como contenido, no como una app.
4. **Solo se publica lo terminado.** El sitio muestra únicamente las rutas listas.
5. **Cada caso termina en un entregable de portafolio.**

## 4. Catálogo

Cada ruta apunta a un cargo junior y se compone de 4 o 5 **casos** (un caso es un curso) más un proyecto final.

| Ruta (cargo) | Casos | Motores |
|---|---|---|
| **Data Analyst** | SQL, Excel, Python, Power BI, proyecto final | sql, python, sheet |
| **Ciberseguridad Junior** (SOC N1, soporte seguro, GRC) | Fundamentos y redes, SOC y alertas, identidad y endpoints, GRC con leyes 21.663/21.719, proyecto final | logs, terminal |
| **Full Stack Junior** | HTML/CSS, JavaScript/TypeScript, React, backend con Node y base de datos, proyecto final | web, sql |
| **Cloud/DevOps Junior** | Linux y terminal, Git y CI/CD, Docker y deploy, observabilidad, proyecto final | terminal, logs |

- **IA aplicada** no es una ruta aparte. Aparece como misiones transversales dentro de cada ruta: IA para analizar datos, IA en el SOC, IA para programar.
- **Orden de entrega:**
  - La v2 se lanza cuando la ruta **Data Analyst** está completa.
  - Después se publican **Ciberseguridad**, **Full Stack** y **Cloud/DevOps**, en ese orden, cada una apenas esté terminada y con su propio plan.
  - Todas las rutas se construyen.
- El contenido de la v1 (repos `aula-*`) es material de referencia para escribir los casos. No se porta tal cual.

## 5. Estructura del proyecto

Monorepo con pnpm:

```
syntaxerror-v2/
  apps/
    web/        Next.js 15 (App Router): sitio, cuenta, misiones, portafolio, admin, profesor, API
    worker/     BullMQ + socket.io: emails, tutor IA, tiempo real
  packages/
    db/         schema Drizzle, migraciones, cliente
    engines/    motores client-side: sql, python, sheet, terminal, logs, web
    content/    cargador y validador de contenido (schemas zod)
    ui/         design tokens e identidad visual (portada desde la v1)
  content/
    rutas/      <ruta>.yaml
    casos/      <caso>/ (caso.yaml, datos/, misiones/*.mdx)
  scripts/      migrar-v1.ts, utilidades
  docker/       Dockerfiles de dev y prod
  docker-compose.yml
```

Stack: Next.js 15, React 19, TypeScript, Tailwind 4, Auth.js v5 (Google y credenciales), Drizzle, Postgres 16, Redis 7, BullMQ, socket.io, Vitest, Playwright y Sentry.

## 6. Desarrollo local en Docker

En el host solo se necesitan Docker y npm.

| Comando | Qué hace |
|---|---|
| `npm run dev` | `docker compose up`: levanta `postgres`, `postgres-test`, `redis`, `mailpit`, `db-setup`, `web` y `worker` |
| `npm run stop` | `docker compose down`. Los datos se conservan en un volumen |
| `npm run reset` | `docker compose down -v`: borra los datos para partir limpio |
| `npm test` | Tests (Vitest y Playwright) dentro de los contenedores, contra `postgres-test` |

- `db-setup` es un servicio de una sola ejecución: aplica migraciones, sincroniza el contenido y hace el seed (admin local). `web` y `worker` esperan a que termine bien.
- `web` y `worker` corren en modo dev con el código montado como volumen y hot reload. Sus `node_modules` viven en volúmenes del contenedor, sin mezclar binarios de macOS y Linux.
- Puertos: web en `3000`, Mailpit en `8025`, Postgres en `5432` y `5433` (test), Redis en `6379`.

## 7. Motor de Misiones

### 7.1 Contenido en disco

```
content/casos/sql-distribuidora/
  caso.yaml          slug, título, ruta, cargo, empresa ficticia, dataset, entregable, orden de misiones
  datos/             tablas o CSV del caso (datos chilenos realistas)
  misiones/
    01-primer-reporte.mdx
    02-clientes-de-regiones.mdx
```

`content/rutas/<ruta>.yaml` define el título, el cargo, la descripción, los casos en orden y el estado (`publicada` o `borrador`).

### 7.2 Estructura de una misión

Cada misión es un archivo MDX con frontmatter (`titulo`, `tiempo`) y estos bloques:

| Bloque | Propósito | Regla |
|---|---|---|
| `<Brief de="...">` | Contexto del caso y lo que pide alguien de la empresa | 150 palabras máximo |
| `<Concepto>` | Lo mínimo para resolver, con ejemplo ejecutable (`<SqlEjemplo>`, `<PythonEjemplo>`, etc.) | Una idea por misión |
| Tarea (`*Task`) | Resolver en el motor real | Al menos una por misión |
| `<Decision>` | Criterio profesional dentro del caso | Opciones mezcladas en cada carga, con explicación por opción. Nunca es la única actividad |
| `<Debrief entrevista="...">` | Por qué funciona, error común y cómo se pregunta en una entrevista | Se muestra al aprobar |

Ejemplo:

```mdx
---
titulo: Clientes de regiones
tiempo: 10
---
<Brief de="Paula, jefa comercial">Necesito saber qué clientes compran fuera de Santiago...</Brief>

<Concepto>WHERE filtra filas... <SqlEjemplo>SELECT * FROM clientes WHERE ciudad <> 'Santiago'</SqlEjemplo></Concepto>

<SqlTask
  solucion="SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago'"
  comparar="filas-sin-orden"
  pistas={["Usa WHERE", "El operador distinto es <>"]} />

<Decision pregunta="Paula pide 'solo los activos'. ¿Qué haces?"
  opciones={[{ texto: "Pregunto qué significa activo", correcta: true, porque: "..." }, ...]} />

<Debrief entrevista="Te pueden pedir filtrar con varias condiciones...">...</Debrief>
```

### 7.3 Tareas y validación

Todo se ejecuta en el navegador del alumno.

| Componente | Motor | Validación |
|---|---|---|
| `SqlTask` | alasql (portado de la v1) | Compara el resultado con la solución de referencia (`filas-en-orden`, `filas-sin-orden`) o el estado final de una tabla |
| `PythonTask` | Pyodide en Web Worker (portado de la v1) | Tests ocultos con `assert` sobre las variables del alumno, con timeout |
| `SheetTask` | planilla (portada de la v1) | Valores o fórmulas esperadas en celdas |
| `TerminalTask` | shell simulada sobre un sistema de archivos virtual | Estado final de archivos o salida esperada |
| `LogTask` | visor de logs con filtros | Respuesta esperada: IP, usuario, hora, severidad |
| `WebTask` | editor HTML/CSS/JS con vista previa en iframe sandbox | Tests sobre el DOM |

Los motores de lanzamiento son `sql`, `python` y `sheet`, que son los que necesita Data Analyst. `terminal`, `logs` y `web` se construyen con la ruta que los usa primero.

### 7.4 Validador de contenido (en el build)

El build falla si:
- una misión no tiene al menos una tarea práctica;
- un brief supera 150 palabras;
- un caso no declara su entregable;
- una `solucion` no pasa su propio validador al ejecutarse en su motor;
- el contenido no cumple los schemas zod de `packages/content`.

### 7.5 Progreso

- Al aprobar una tarea, el navegador envía `POST /api/progreso` con el identificador de la misión y el resultado.
- Sin sesión, el progreso se guarda en `localStorage` y se sincroniza al iniciar sesión.
- Una misión se aprueba cuando todas sus tareas están aprobadas. Las `Decision` cuentan para puntos, no para aprobar.
- Un caso se completa cuando todas sus misiones están aprobadas y el alumno enlazó su entregable. Con eso se habilita el certificado del caso.
- Una ruta se completa cuando todos sus casos están completos. Con eso se habilita el certificado de la ruta.

## 8. Datos

Schema Drizzle portado desde la v1, con estos cambios:

| v1 | v2 |
|---|---|
| `courses`, `learning_paths`, `learning_path_courses` | `casos`, `rutas`, `ruta_casos`: se sincronizan desde `content/` en cada deploy. El contenido manda; la base guarda IDs, estado y metadatos |
| `lesson_progress` | `mision_progreso` (usuario, caso, misión, estado, intentos, `aprobada_en`) |
| `course_enrollments`, `path_enrollments` | `caso_inscripciones`, `ruta_inscripciones` |
| — | `entregables` (usuario, caso, URL, fecha) |
| `certificates` | `certificados` (por caso o ruta) y `certificados_legacy` |
| `admin_metrics_snapshot` | Métricas por misión: intentos, dónde se traban, abandono |

Se portan con cambios mínimos (de curso a caso):
- `users` y `accounts`;
- `point_transactions` (puntos por misión aprobada);
- `teacher_questions` y `teacher_requests` (con contexto de misión);
- `classes`, `class_courses` → `clase_casos`, y `class_enrollments`;
- `course_ratings` → reseñas por caso;
- `feedback_reports`, `user_messages`, `audit_log` y `email_change_requests`;
- `ai_chat_cache` y `ai_chat_questions` (el tutor recibe la misión como contexto).

## 9. Funciones de plataforma

Todas las funciones de la v1 se portan y se adaptan a casos y misiones:

- **Cuentas:** registro, login con Google y credenciales, verificación de email, cambio de email y clave, eliminación de cuenta y derechos ARCO.
- **Aprendizaje:** catálogo de rutas y casos, misiones, progreso, "continuar donde quedé", buscador y certificados verificables en `/verificar/[code]`.
- **Portafolio:** `/p/<usuario>` público, con casos completados, entregables enlazados y certificados.
- **Tutor IA:** Gemini vía la cola del worker, con respuesta en tiempo real por socket.io, contexto de la misión, caché y límite por usuario.
- **Comunidad:** preguntas al profesor, clases de profesor con casos asignados, puntos y niveles, reseñas por caso, reportes de bugs y sugerencias, y mensajes internos.
- **Admin:** gestión de usuarios, casos y rutas (estado de publicación), métricas por misión y bitácora de auditoría.
- **Emails temáticos:** todos los de la v1, enviados por el worker (Mailpit en local, Resend en producción).
- **Seguridad:** rate limiting, CSRF por origen, headers de seguridad y CSP (incluidas las excepciones que requiere Pyodide).

## 10. Migración desde la v1

`scripts/migrar-v1.ts` lee de la base v1 y escribe en la base v2. Es idempotente y se puede ejecutar varias veces.

1. **Usuarios y cuentas:** mismo `id`, mismo hash de contraseña, mismas cuentas de Google y mismo rol. Los alumnos entran con sus credenciales de siempre.
2. **Certificados:** se copian a `certificados_legacy` como una foto fija (código, nombre del alumno, curso o ruta, tipo y fecha). `/verificar/[code]` busca primero en `certificados` y después en `certificados_legacy`, así que las URLs ya compartidas siguen funcionando.
3. **Puntos, bitácora y registros de derechos ARCO:** se copian por historial y obligación legal.
4. **No se migran:** progreso de lecciones, inscripciones, reseñas de cursos v1, caché del tutor ni snapshots de métricas.
5. Al terminar, el script imprime un informe: cuántos registros se copiaron y cuántos se omitieron, con la razón.

## 11. Errores y resiliencia

- Si falla un motor en el navegador (por ejemplo, Pyodide no carga), la misión muestra un error claro con botón de reintento y conserva lo que escribió el alumno.
- El progreso sin conexión queda en `localStorage` y se sincroniza al volver.
- Los emails y el tutor IA pasan por colas con reintentos. Si Gemini falla, el tutor lo informa y la misión sigue funcionando.
- Hay páginas de error y 404 con la identidad glitch de la v1.
- Sentry con muestreo bajo de trazas.

## 12. Tests

- **Contenido:** el validador del build (sección 7.4).
- **Motores:** tests unitarios por motor: modos de comparación en SQL, `assert` y timeout en Python, celdas y fórmulas en la planilla.
- **API y datos:** Vitest contra `postgres-test` para progreso, certificados, migración desde la v1 y permisos (admin, profesor, alumno).
- **End-to-end** con Playwright en Docker:
  1. registrarse;
  2. aprobar una misión de SQL;
  3. enlazar el entregable y obtener el certificado;
  4. verificar un certificado legacy migrado.

## 13. Deploy

- **Railway**, en el mismo proyecto `syntaxError`. Los servicios `web` y `worker` de la v2 reemplazan a `cursos` y `worker` de la v1. Se mantienen Postgres y Redis.
- La v2 usa una **base nueva (`syntaxerror_v2`) en la misma instancia Postgres**. La base v1 queda intacta como respaldo.
- **Imágenes Docker multi-stage:** Next.js con `output: "standalone"`, worker compilado a JS (sin `tsx` en runtime) y límites de memoria en Node y en Railway.
- Las páginas de misiones se generan estáticas en el build. Pyodide, los datasets y los assets con hash se sirven con `Cache-Control: public, max-age=31536000, immutable`. Ningún asset pasa por `auth()` ni por la base.
- La v1 queda apagada hasta el lanzamiento de la v2.

## 14. Criterios de éxito

- El costo del proyecto en Railway queda bajo $12 al mes, con la RAM del web estable por debajo de 512 MB.
- En una máquina limpia con solo Docker, `npm run dev` deja la plataforma operativa en `localhost:3000`, y `npm run stop` la baja.
- Data Analyst lanza con sus 5 casos, todos con entregable de portafolio.
- No hay ninguna misión publicada sin tarea práctica.
- Los alumnos de la v1 entran con su cuenta y sus certificados siguen verificables en la misma URL.
- Un caso nuevo se produce escribiendo contenido en `content/`, sin tocar código de la app.

## 15. Fuera del lanzamiento

- Editor visual de cursos.
- Migrar el progreso de lecciones de la v1.
- Rutas Ciberseguridad, Full Stack y Cloud/DevOps: entregas posteriores, cada una con su propio spec y plan, en ese orden.

## 16. Fases de implementación

Cada fase tiene su propio plan y deja el repo funcionando.

1. **Fundación:** monorepo, Docker (`npm run dev`, `npm run stop`, `npm run reset`, `npm test`), `packages/db` con el schema v2, `packages/ui` con la identidad visual, auth y layout del sitio.
2. **Motor de Misiones:** `packages/content` (schemas y validador), `packages/engines` (sql, python y sheet portados), render de misiones, progreso y sincronización del contenido con la base.
3. **Plataforma:** portar certificados, portafolio, tutor IA, worker y colas, emails, comunidad (preguntas, clases, puntos, reseñas, reportes, mensajes), admin, ARCO y bitácora.
4. **Contenido Data Analyst:** los 5 casos con sus misiones y entregables.
5. **Migración y lanzamiento:** `migrar-v1.ts`, imágenes de producción, deploy en Railway y verificación de los criterios de éxito.
