# Primera entrada y rutas desde el admin: diseño

**Fecha:** 2026-10-06. **Estado:** implementado el 2026-10-07. Las decisiones que cambiaron al implementar están marcadas con **(al implementar)**.

## 1. Problema

Quien entra por primera vez al panel no entiende qué es la plataforma ni por dónde empezar:

- **El panel actual** muestra un saludo, el nivel 1 con 0 puntos, tres enlaces de comunidad vacíos y, al final, "Todavía no empiezas ningún caso. Mira las rutas" en un enlace pequeño.
- **Hoy no hay ruta abierta:** quien no es probador ve "Estamos terminando la primera ruta" en `/rutas`, porque Data Analyst está en beta.
- **La v1 tenía varias rutas,** y las que no estaban listas se mostraban en la portada como una filtración (`LEAKED_ROADMAP`). Un admin las prendía y apagaba. La v2 copió el CSS de esas tarjetas (`leak-course-card`, `typographic-glitch`), pero no lo usa en ninguna parte, y el estado de una ruta solo se cambia editando el YAML y haciendo deploy.

## 2. Objetivo

- **La primera vez,** la persona entiende en menos de un minuto qué es syntaxError, ve que puede elegir entre varias rutas y queda con una elegida y su primer paso a la vista.
- **Las siguientes veces,** lo primero que ve es dónde quedó, y sigue con un clic.
- **El admin** prende, pone en beta, filtra u oculta cada ruta sin hacer deploy.
- **Todo funciona** en teléfono y computador, con tema claro y oscuro, y con la estética técnica y glitch del sitio.

## 3. La terminal de bienvenida

### Cuándo aparece

- Al abrir `/dashboard`, si la cuenta es de **estudiante** y `bienvenida_vista_en` está vacío.
- **No aparece** a docentes ni admins.
- **No aparece en otras páginas:** quien llega directo a un caso, a una clase de su docente o a un certificado no la ve.
- **Se puede volver a abrir** desde el enlace "¿Cómo funciona?" del panel. Al volver a abrirla no cambia `bienvenida_vista_en`, y se puede cerrar con `explorar`.

### Cómo se ve

- **Es un `<dialog>` modal nativo,** centrado en la pantalla, con un máximo de 760 px de ancho y el 85 % del alto (`85svh`). El texto se desplaza **dentro** de la terminal. El panel queda detrás, oscurecido y desenfocado.
- **En teléfono (menos de 640 px)** ocupa la pantalla completa (`100svh`, sin bordes redondeados).
- **La terminal es oscura en los dos temas,** como el bloque de arranque de la maqueta. El color de acento sale de `--primary`.
- **No tiene botón de cerrar.** Esc y el clic afuera no la cierran: Esc escribe `la bienvenida no se cierra con Esc: elige una ruta o escribe explorar`.
- **Accesibilidad:**
  - `aria-modal` y un `aria-label`, "Bienvenida a syntaxError.cl";
  - la salida en `aria-live="polite"`;
  - el foco queda en el prompt;
  - el menú es un `listbox` con `aria-selected` y, para las filtradas, `aria-disabled`.
- **Con `prefers-reduced-motion`,** el texto aparece completo, sin escritura animada ni destellos de glitch.

### El prompt

El prompt es `<handle>@syntaxerror.cl:~$`. En teléfono se muestra solo `~$`. El handle es, en este orden:

1. el `usuario` del portafolio, si existe;
2. el primer nombre, en minúsculas, sin tildes y con solo `[a-z0-9]` ("José Ñancupil" → `jose`);
3. lo que va antes de la @ del correo, con la misma limpieza;
4. `estudiante`.

### La secuencia

```
> hola, Camila. iniciando syntaxError.cl…
[ok] rutas    eliges un oficio: cada ruta te prepara para un cargo
[ok] casos    resuelves problemas de empresas chilenas, misión por misión
[ok] ayudas   pistas si te trabas, tutor IA y asistente para conceptos
[ok] cierre   entregable → portafolio → certificado verificable
camila@syntaxerror.cl:~$ ls rutas/
```

Al final, la terminal "teclea" sola `ls rutas/` y muestra el menú de rutas:

- **Disponibles para esta persona** (publicadas y, si es probadora, beta): slug, cargo y la etiqueta `[abierta]` o `[beta]`.
- **Filtradas:** el slug con `typographic-glitch leak-course-title` y `LEAK_0x<nn> / NO_ACTIVADO` con `upcoming-leak-meta`. El número sale del orden de la ruta en el contenido, desde `0x11`.
- **Ocultas:** no aparecen.

Después aparece la ayuda: `Usa ↑ ↓ y Enter para elegir, o escribe elegir <ruta>. help muestra los comandos.`

### Comandos

| Comando | Qué hace |
|---|---|
| `help` o `ayuda` | Lista los comandos. |
| `ls`, `ls rutas` | Vuelve a mostrar el menú. |
| `cat <ruta>` | Muestra la ficha: título, cargo y descripción. En una filtrada, el `teaser` y `[SLUG] :: buffer_corrupt`. |
| `elegir <ruta>`, `cd <ruta>`, `start <ruta>` | Elige la ruta. Acepta la barra final (`data-analyst/`). |
| `explorar`, `exit`, `salir` | Entra sin elegir ruta. Se ofrece en letra chica, para quien viene por una clase de su docente o solo a mirar. |
| `clear` | Limpia la salida. |
| otro | `comando no encontrado: <x> · escribe help`. |

**Teclado y toque:**
- ↑ y ↓ mueven la selección.
- Enter elige la seleccionada cuando el prompt está vacío.
- En teléfono se toca la ruta, y hay atajos para tocar: `ls rutas`, `help` y `explorar sin elegir`.

**Respuestas especiales:**
- **Elegir una filtrada** responde `acceso denegado: <slug> · LEAK_0x<nn> · la ruta sigue compilando. Pronto se activa.`, y la terminal sigue abierta.
- **Ninguna ruta disponible** (por ejemplo, hoy, para quien no es probador): la terminal lo dice (`> las rutas están compilando. te avisamos cuando abra la primera.`), muestra las filtradas y deja pasar con `explorar`.

### Al elegir

1. Llama a `POST /api/cuenta/bienvenida` con `{ ruta: "<slug>" }`. La API marca `bienvenida_vista_en` y guarda `ruta_elegida`.
2. Escribe `[ok] ruta guardada en tu cuenta` y `[ok] abriendo el mapa: primer paso <caso>`.
3. Cierra la terminal y navega a `/rutas/<slug>`, donde "Estás aquí" marca el primer paso.

**Con `explorar`:** llama a la misma API con `{ ruta: null }`, que solo marca `bienvenida_vista_en`, y cierra.

**Si la API falla:** la terminal escribe `error: no se pudo guardar. intenta de nuevo` y sigue abierta.

## 4. El panel

**Orden nuevo:** saludo con "¿Cómo funciona?", **Continuar**, **Tus rutas**, **Explora más**, y al final nivel, certificados y comunidad.

### La tarjeta "Continuar"

Siempre va arriba, con borde de color de acento. Tiene cuatro estados:

1. **Con progreso:** usa `siguientePaso` (la misión o lección que sigue).
   - Muestra la ruta, el texto "Sigue con <misión>, de <caso>", una barra con el avance de la ruta en pasos y el botón **Continuar lección** o **Continuar caso**.
   - La ruta de la tarjeta es `ruta_elegida`, si contiene el caso; si no, la primera ruta disponible que lo contiene.
   - Si el paso que sigue es un entregable, se mantiene el texto actual: "Te falta enlazar tu entregable".
2. **Con ruta elegida, sin progreso:** "Tu ruta: <ruta> · Empieza por <primer caso>" y el botón **Empezar**, que lleva a `/rutas/<slug>`.
3. **Sin ruta elegida ni progreso**, por ejemplo después de `explorar`: el selector de rutas va en lugar de la tarjeta (ver la sección 5).
4. **Ruta elegida en pausa** (el admin la dejó filtrada u oculta, o en beta y la persona no es probadora): "Tu ruta <ruta> está en pausa. Tu progreso queda guardado." Después, el selector de rutas.

### Las demás secciones

- **Tus rutas:** las rutas disponibles con al menos un caso con progreso, con "X de Y pasos". Debajo va el enlace **Cambiar de ruta**, que abre el selector.
- **Explora más:** las otras rutas disponibles y las filtradas, como tarjetas pequeñas.
- **Rutas en beta:** la sección actual de probadores se mantiene. Sus rutas también aparecen en el selector con la etiqueta "beta".

## 5. Selector de rutas y `/rutas`

Es un mismo componente, `SelectorRutas`, que se usa en el panel y en `/rutas`:

- **Abierta:** tarjeta con título, cargo, cantidad de casos y de bloques de clases, descripción y el botón **Empezar** o **Elegir**.
  - Con sesión, guarda la elección en `PUT /api/cuenta/ruta` y lleva al mapa.
  - Sin sesión, lleva a `/registro?callbackUrl=/rutas/<slug>`.
- **Beta:** la misma tarjeta con la etiqueta "beta". Solo la ven probadores y admins.
- **Filtrada:** `leak-course-card` con `upcoming-leak-meta` (`LEAK_0x<nn> / NO_ACTIVADO`), el título en `typographic-glitch leak-course-title`, el teaser y `upcoming-leak-fragment` (`[SLUG] :: buffer_corrupt`). **No es enlace.** Se usa el efecto de la v1 tal como está en `globals.css`, sin otro glitch.
- **Oculta:** no aparece.

La portada sigue igual. Agregar ahí las filtraciones queda fuera de esta entrega.

## 6. Estados de una ruta

### Contenido (YAML)

- `estado` pasa a ser el **estado inicial**, con los valores `publicada | beta | filtrada | borrador`.
- `teaser` es un campo opcional nuevo: una línea para la ficha filtrada.
- Una ruta `filtrada` o `borrador` puede tener `casos: []`. Una `publicada` o `beta` sigue necesitando al menos un caso.
- `borrador` significa "en desarrollo en el repo": no se compila en producción y el admin no la puede cambiar.
- **Rutas futuras nuevas:** se crean como `filtrada` y sin casos.

| Slug | Título | Cargo | Teaser |
|---|---|---|---|
| `ciberseguridad` | Ciberseguridad | Analista SOC junior | Monitorea, detecta y responde incidentes como en un SOC real. |
| `full-stack` | Full Stack | Desarrollador/a web junior | Construye y despliega aplicaciones web de punta a punta. |
| `cloud-devops` | Cloud / DevOps | Ingeniero/a cloud junior | Automatiza, despliega y opera servicios en la nube. |
| `ia-aplicada` | IA aplicada | Especialista en IA aplicada | Usa modelos de IA para automatizar y resolver problemas de negocio. |

Los textos son una propuesta; el equipo los puede cambiar en los YAML.

### Base de datos (migración 0011)

- **En `rutas`,** tabla que ya sincroniza el contenido:
  - `estado_admin text null`, con `publicada | beta | filtrada | oculta`;
  - `estado_cambiado_por uuid null`, que referencia a `users`;
  - `estado_cambiado_en timestamp null`.
  - La sincronización sigue escribiendo `estado` desde el YAML y **nunca toca** `estado_admin`.
- **En `users`:**
  - `bienvenida_vista_en timestamp null`;
  - `ruta_elegida uuid null`, que referencia a `rutas.id` con `on delete set null`.

**Estado vigente:** `estado_admin ?? estado`. Una ruta `borrador` en el YAML queda oculta y fuera del build, sin importar `estado_admin`.

### Compilación

- Se compilan las páginas de casos de toda ruta que no esté en `borrador` en el YAML y tenga casos, incluidas las `filtrada`. Así un cambio del admin no necesita un build nuevo.
- Las páginas de casos y misiones **siguen estáticas** (`dynamic = "error"`).

### Acceso

`puedeUsarCaso(db, userId, casoSlug)` reemplaza a `exigirAccesoBeta`. Un caso se puede usar si está en al menos una ruta con estado vigente:
- `publicada`; o
- `beta`, y la persona es probadora o admin.

La función cuida las cinco APIs que hoy revisan la beta:
- `api/progreso`;
- `api/entregables`;
- `api/puntos/decision`;
- `api/tutor/preguntas`;
- `api/asistente/preguntas`.

Si la persona no tiene acceso, la API responde 403 `{ error: "ruta_no_disponible" }`.

En desarrollo y e2e (`CONTENT_INCLUDE_DRAFTS=true`) todo sigue visible y usable, como hoy.

**Riesgo aceptado (ya existía con la beta):** quien conozca la URL de un caso de una ruta no abierta ve la página estática, pero no puede guardar progreso ni usar el tutor.

### Páginas que pasan a leer el estado

- `/rutas` y `/rutas/[ruta]` dejan de ser estáticas.
- **(al implementar)** El estado de las rutas se lee de la base en cada pedido, sin caché. Son pocas filas, y con `unstable_cache` + `revalidateTag` la primera página después de un cambio del admin todavía podía mostrar el estado anterior.
- En desarrollo y e2e, `/rutas/[ruta]` muestra todas las rutas, como el resto del contenido.
- `/rutas/[ruta]` da 404 si la ruta está oculta o filtrada, y también si está en beta y la persona no es probadora. El admin ve todas, con el aviso de beta que ya existe.

## 7. Admin de rutas

- **Página `/admin/rutas`,** en el menú del admin. Por ruta muestra:
  - el título;
  - el estado vigente y su origen ("del contenido" o "cambiado por <admin> el <fecha>");
  - la cantidad de casos;
  - las personas con progreso;
  - las personas que la tienen elegida;
  - un selector de estado.
- **Reglas del selector:**
  - `publicada` y `beta` se deshabilitan si la ruta no tiene casos compilados;
  - las rutas en `borrador` se muestran sin selector, con el texto "en desarrollo en el repositorio";
  - **"Volver al estado del contenido"** pone `estado_admin` en null.
- **Cada cambio pide confirmación** con `Confirmacion` (8e). El texto dice qué verá la gente, por ejemplo "Ciberseguridad pasa a publicada: la ve todo el mundo".
- **API `PATCH /api/admin/rutas/[slug]`** con `{ estado: "publicada" | "beta" | "filtrada" | "oculta" | null }`:
  - pasa por `exigirAdmin` y revisa el Origin;
  - responde 400 si se intenta abrir una ruta sin casos, y 404 si la ruta no existe o está en borrador;
  - registra en la bitácora la acción nueva `ruta_estado_cambiado`, con `targetType` nuevo `route`.

## 8. APIs de la cuenta

- **`POST /api/cuenta/bienvenida`** con `{ ruta: string | null }`:
  - pide sesión;
  - marca `bienvenida_vista_en` si estaba vacío;
  - si llega `ruta`, la valida (que exista y esté disponible para la persona) y la guarda en `ruta_elegida`;
  - responde 400 si la ruta no está disponible.
- **`PUT /api/cuenta/ruta`** con `{ ruta: string }`: cambia `ruta_elegida`, con la misma validación. También marca `bienvenida_vista_en` si estaba vacío, para que quien elige desde `/rutas` no vea la terminal después.
- **(al implementar)** El Origin lo revisa `middleware.ts`, como en el resto de las APIs; las rutas no lo repiten.

**(al implementar)** El formulario y la API de clases del docente (`/profesor`, `POST /api/profesor/clases`) ofrecen las rutas con casos que el docente puede usar según el estado vigente (`rutasParaClases`). Con las rutas futuras sin casos, la primera ruta del listado ya no servía para una clase.

## 9. Pruebas

**Unitarias:**
- el estado vigente (YAML, admin, borrador);
- `puedeUsarCaso`, con los cuatro estados, probador y admin;
- el handle del prompt (usuario, nombre con tildes y ñ, correo, vacío);
- el intérprete de comandos de la terminal (cada comando, la barra final, lo desconocido, la filtrada);
- los cuatro estados de "Continuar";
- el esquema del contenido (filtrada sin casos válida, publicada sin casos inválida);
- la sincronización, que no pisa `estado_admin`.

**APIs:** bienvenida, ruta y admin de rutas, con sus casos 400, 403 y 404 y la bitácora.

**E2E:**
1. Una estudiante nueva ve la terminal, elige Data Analyst con el teclado, llega al mapa con "Estás aquí" en el Caso 0, vuelve al panel y ya no ve la terminal. "Continuar" dice "Empezar".
2. Una estudiante nueva escribe `explorar` y ve el selector en el panel.
3. `elegir ciberseguridad` responde acceso denegado y la terminal sigue abierta.
4. El admin pasa una ruta a filtrada: `/rutas` muestra la tarjeta leak, `/rutas/<slug>` da 404 y la API de progreso de un caso de esa ruta responde 403. Después la devuelve al estado del contenido.
5. Un docente no ve la terminal.
6. En el teléfono, la terminal ocupa la pantalla y se elige tocando.

**Ojo con los e2e que ya existen:** los que crean una estudiante y van a `/dashboard` se toparían con la terminal. Hay que agregar un helper que cierre la bienvenida (`POST /api/cuenta/bienvenida { ruta: null }`) y usarlo en esos tests.

## 10. Fuera de alcance

- "Avísame cuando abra" en las rutas filtradas.
- Las filtraciones en la portada.
- Inscripciones formales con cupos o fechas.
- Preguntas de diagnóstico para recomendar una ruta.
- Editar el contenido de las rutas desde el admin.
- Escribir los casos de las rutas futuras.
