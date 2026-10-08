# Ficha del alumno y avance enviado: diseño

**Fecha:** 2026-10-08. **Estado:** implementado.

## 1. Problema

- **El admin no ve cómo va cada persona.** La página `/admin/usuarios/[id]` solo lista los casos empezados con "N/M misiones". No muestra en qué lección va, cuántas veces falló ni cuándo fue la última vez que entró. Tampoco muestra si tiene una entrega observada o una pregunta sin responder.
- **El alumno tampoco ve el detalle.** "Tu panel" muestra las rutas y dónde continuar, pero no el detalle lección por lección.
- **No hay forma de escribirle a alguien sobre su avance** desde la plataforma.

## 2. Objetivo

- **El admin detecta trabas** al abrir la ficha de una persona: lo primero que ve es qué la tiene detenida y dónde.
- **El admin puede enviarle su avance** cuando quiera: un email con una nota personal opcional, un resumen y un enlace a su página de avance.
- **El alumno ve su avance** en cualquier momento, lección por lección, con un siguiente paso concreto y un tono amable.
- **Estética de terminal** ("bien hacker"), como `> whoami` del panel y el mapa `git log` de las rutas. Funciona en teléfono y computador, con tema claro y oscuro.

## 3. Datos: `avanceDelAlumno`

`apps/web/src/lib/avance/datos.ts` exporta `avanceDelAlumno(db, userId)`. Solo lee: no cambia la base ni necesita migraciones.

Devuelve:

- **El perfil:**
  - el nombre, el email, el rol, si es probador y la fecha de registro;
  - el nivel y los puntos (`obtenerNivel`).
- **La última actividad:** el `actualizado_en` más reciente de `mision_progreso`. Si no hay progreso, es `null`.
- **Las rutas:**
  - **Cuáles entran:** las rutas en las que la persona tiene inscripción o algún caso empezado, más la ruta elegida en la bienvenida.
  - **Los casos de cada ruta:** van en el orden del contenido y cada uno lleva su estado: `completo`, `en_curso` (con al menos una misión con progreso) o `pendiente`.
  - **Las lecciones de cada caso:** van en el orden del contenido. De cada una se guarda el slug, el título, el estado (`aprobada`, `en_curso` o `sin_empezar`), los intentos, los fallidos y la fecha de actualización.
  - **Unidad:** los casos de tipo `clases` se cuentan en lecciones; los demás, en misiones. Se usa `unidad(caso.tipo)`, como en el panel.
- **Las entregas:**
  - de cada una: el caso, el estado (`pendiente`, `aprobado` u `observado`), los puntajes de la rúbrica (1 a 3) con sus observaciones, el comentario y las fechas;
  - el enlace del repositorio.
- **Las preguntas a docentes pendientes:** las de `teacher_questions` con estado `pendiente`, cada una con el caso, la lección y la fecha.
- **La actividad reciente:** los últimos 20 eventos, mezclados y ordenados por fecha, de más nuevo a más viejo. Son de cuatro tipos:
  - una lección aprobada (`mision_progreso.aprobada_en`);
  - una entrega enviada o revisada;
  - una pregunta al tutor o a un docente;
  - puntos ganados (`point_transactions`).

  Cada evento trae la fecha, el tipo, un texto corto y un enlace.

Los títulos de casos y lecciones salen de `casos.misiones`, sincronizado desde el contenido. Si una lección guardada ya no existe ahí, se omite. **(al implementar)**

## 4. Trabas: `trabasDelAlumno`

`apps/web/src/lib/avance/trabas.ts` exporta `trabasDelAlumno(avance, ahora)`, una función pura que devuelve una lista de trabas. Cada traba tiene un tipo, un texto para el admin, un texto para el alumno y un enlace.

Las reglas y sus umbrales son constantes exportadas:

| Tipo | Regla | Texto del admin | Texto del alumno |
|---|---|---|---|
| `inactivo` | Tiene un caso `en_curso` y la última actividad fue hace **más de 7 días** | `sin actividad hace N días · <caso>` | Hace N días que no avanzas en *<caso>*. Retoma en *<lección>*. |
| `lección` | Una lección no aprobada con **5 o más fallidos** (el umbral de la última pista) | `N intentos fallidos · <caso> / <lección>` | Llevas varios intentos en *<lección>*: abre las pistas o pregúntale al tutor. |
| `entrega` | Una entrega con estado `observado` | `entrega observada · <caso>` | Tu entrega de *<caso>* tiene observaciones: revísalas y vuelve a enviarla. |
| `pregunta` | Una pregunta a un docente `pendiente` | `pregunta sin responder hace N días · <caso>` | Tu pregunta en *<caso>* todavía espera respuesta: te avisaremos por email. |

**Siguiente paso:** si no hay trabas, el alumno ve el siguiente paso calculado por `siguienteDelAvance(avance)`, con la misma regla del botón "Continuar" del panel pero usando el avance ya armado. **(al implementar)**

## 5. La ficha del admin: `/admin/usuarios/[id]`

La página se rehace con secciones de terminal: monoespaciado, un prompt `$` en el color de acento y colores por estado (verde para lo completo, acento para lo que está en curso, gris para lo pendiente y rojo para las trabas).

1. **`$ whoami`:**
   - el nombre (o el email), el email, el rol y si es probador;
   - si confirmó el email;
   - la fecha de registro, la **última actividad** ("hace 3 días") y el nivel con sus puntos.
2. **`$ status`:** las trabas del admin, cada una con su enlace. Si no hay, muestra `0 problemas · todo en orden`.
3. **`$ git log --ruta <slug>`:** una sección por cada ruta.
   - **Los casos:** cada uno lleva su marca (`✓` completo, `▶` en curso, `·` pendiente) y su avance en N/M de su unidad.
   - **Los casos en curso** se abren lección por lección. Cada lección muestra su estado, los intentos, los fallidos y la fecha. Las que tienen la traba `lección` van en rojo.
   - **Los demás casos** se pueden abrir con un `<details>`.
4. **`$ tail actividad`:** los 20 eventos recientes, con la fecha relativa.
5. **Entregas:** el caso, el estado, el puntaje de cada dimensión de la rúbrica, la fecha y un enlace a la revisión.
6. **Enviar avance:** ver la sección 7.
7. **Rol, Probador y Eliminar cuenta:** quedan sin cambios.

Las secciones 3 y 4 usan los mismos componentes que la página del alumno, con una propiedad que activa los datos internos.

## 6. La página del alumno: `/dashboard/avance`

- **Acceso:** pide una sesión iniciada. Si no la hay, pasa por el login y vuelve a la página (`callbackUrl`). Cada persona ve solo su propio avance.
- **Las secciones:**
  - **`$ whoami`:** el nombre, el nivel y los puntos;
  - **`$ next`:** las trabas en el texto del alumno o, si no hay, el siguiente paso, con un botón para ir;
  - **`$ git log --ruta`** y **entregas:** las mismas de la ficha, sin datos internos. La entrega muestra los puntajes y las observaciones de la rúbrica.
- **Lo que no muestra:** el rol, el probador, el email de confirmación, el conteo de fallidos ni la actividad de otras personas. En cada lección se ve el estado y la fecha, sin contar los intentos fallidos.
- **Desde "Tu panel":** se agrega un enlace "Ver tu avance" junto a la tarjeta "Continuar".

## 7. Enviar el avance

### En la ficha

- **La tarjeta "Enviar avance"** tiene un campo de nota opcional (hasta 1000 caracteres), un botón "Enviar avance" y una línea con el último envío ("Último envío: hace 2 días, por admin@…").
- **Si la persona no confirmó su email,** la tarjeta lo advierte, pero igual permite enviar.

### `POST /api/admin/usuarios/[id]/avance`

- **Validaciones:**
  - solo un admin (`exigirAdmin` de `lib/permisos`, como `api/admin/usuarios/[id]`), con la misma protección de origen que las demás rutas de la API;
  - el cuerpo es `{ nota?: string }`, con un máximo de 1000 caracteres; la nota se recorta y, si queda vacía, se trata como si no hubiera nota;
  - la persona existe.
- **Límite:** un envío por alumno cada **10 minutos**. Se calcula con la bitácora, buscando un `progress_sent` con ese `target_id` en los últimos 10 minutos, así que no necesita una tabla nueva. Si ya hubo un envío, responde 429 con el mensaje "Ya enviaste el avance hace menos de 10 minutos".
- **Qué hace:**
  1. arma el resumen con `avanceDelAlumno` y `trabasDelAlumno`;
  2. encola un email de tipo `avance`;
  3. registra `progress_sent` en la bitácora, con el actor, `target_type: "user"`, el `target_id` y en `metadata` la nota y el email de destino.
- **Si la cola falla:** responde 503 y no registra nada en la bitácora, para que se pueda reintentar. Por eso no se usa `encolarSinFallar`, que oculta el error.

### El email (`tipo: "avance"`)

El nuevo tipo de `TrabajoEmail` es:

```ts
(Destinatario & {
  tipo: "avance";
  nota: string | null;
  rutas: { titulo: string; completos: number; total: number }[];
  enCurso: { caso: string; leccion: string | null } | null;
  pasos: string[]; // los textos del alumno de sus trabas, o el siguiente paso
  enlace: string; // https://syntaxerror.cl/dashboard/avance
})
```

- **El asunto:** "Tu avance en syntaxError.cl".
- **El cuerpo usa la plantilla actual del worker:**
  1. el saludo;
  2. la nota, si la hay, como un párrafo que empieza con "Nota del equipo:";
  3. el avance de cada ruta en una línea ("Data Analyst: 3 de 9 casos");
  4. dónde va;
  5. los siguientes pasos;
  6. el botón "Ver tu avance".
- **La versión en texto plano** tiene el mismo contenido.
- **Datos personales:** el email solo trae datos de la persona que lo recibe.

## 8. Pruebas

- **Unitarias:**
  - `trabasDelAlumno`: cada regla en su umbral y justo debajo, los textos del admin y del alumno, y el caso sin trabas.
  - El email `avance`: con nota y sin nota, con trabas y sin ellas, y la versión en texto plano.
- **De integración (contra `postgres-test`):**
  - `avanceDelAlumno`: el orden de las rutas, casos y lecciones, los estados, la unidad de las clases, las entregas, las preguntas pendientes, la actividad (ordenada y limitada a 20) y una lección que ya no existe en el contenido.
  - `POST /api/admin/usuarios/[id]/avance`:
    - un alumno o un docente recibe 403;
    - un id inexistente recibe 404;
    - una nota de más de 1000 caracteres recibe 400;
    - el envío correcto encola el email y registra la bitácora;
    - un segundo envío antes de 10 minutos recibe 429;
    - si la cola falla, responde 503 sin registrar nada en la bitácora.
- **e2e:**
  1. Un alumno falla 5 veces una lección.
  2. El admin abre su ficha y ve la traba en `$ status`.
  3. El admin envía el avance con una nota.
  4. El email llega a Mailpit con la nota y el enlace.
  5. El alumno abre `/dashboard/avance` y ve el mensaje amable.
- **En el navegador, a medida que se avanza:** capturas de la ficha y de la página del alumno en claro, oscuro y teléfono (390 px), sin desplazamiento horizontal. La v2 local corre en http://localhost:3100.

## 9. Fuera de alcance

- **Envíos automáticos** (por ejemplo, semanales o al detectar una traba). Todo envío lo decide un admin.
- **Envíos masivos** a varios alumnos a la vez.
- **Una lista de alumnos trabados** en `/admin/usuarios`. Si hace falta, puede venir después y reutilizar `trabasDelAlumno`.
- **Ver la ficha como docente.** Por ahora solo la ve un admin.
- **Guardar el historial de envíos** en otra parte que no sea la bitácora.
