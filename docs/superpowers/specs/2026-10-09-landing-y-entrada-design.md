# Landing con terminal jugable y entrada directa: diseño

**Fecha:** 2026-10-09. **Estado:** diseño aprobado en la conversación, pendiente de plan.

## 1. Problema

Varias personas contaron que llegan a syntaxerror.cl sin saber nada, se registran y no siguen. Al recorrer el camino de un principiante, de la portada a la primera tarea, aparecen los obstáculos:

- **La portada tiene tres botones con el mismo peso** ("Crear cuenta gratis", "Ya tengo cuenta" y "Ver rutas") y un carrusel que solo se mira. No hay nada que hacer antes de registrarse.
- **La bienvenida tarda unos 4 segundos en escribirse** y termina en un menú de 5 rutas, 4 de ellas con "NO_ACTIVADO". Pide usar ↑ ↓ y Enter, escribir `elegir <ruta>` o `explorar`.
- **Al elegir una ruta se llega al mapa,** no a una lección. El botón "Empezar" del panel también lleva al mapa. Desde ahí faltan dos clics más (el caso y la misión) para llegar a algo que hacer.
- **Con sesión abierta, `/` muestra igual la portada,** con un botón para ir al panel.

## 2. Objetivo y límites

- **Quien llega entiende en segundos qué es syntaxError, hace algo de verdad antes de registrarse y se registra.**
- **Quien ya tiene cuenta entra directo a continuar,** o a empezar su primera lección, y desde ahí ve las otras rutas.
- **Entre registrarse y estar en la primera lección hay un toque.**
- **No se negocia la identidad:**
  - se mantienen la voz, la jerga y la estética de terminal de syntaxError (prompts, `[ok]`, comandos, glitch de las rutas filtradas);
  - lo que cambia es que el siguiente paso siempre es un botón grande y obvio, y que no hace falta escribir nada para avanzar.
- **Fuera de alcance:**
  - el orden de la ruta y el candado del Caso 0 de GitHub, que sigue siendo la primera lección de Data Analyst;
  - la medición del embudo.

## 3. La landing (`/` sin sesión)

### Hero (opción A: la terminal al centro)

En orden vertical, centrado y con un ancho máximo de unos 860 px:

1. `SYNTAXERROR_ / v2.0`, en mono y con el color de acento.
2. **El titular:** "Aprende datos resolviendo trabajos reales. Gratis."
3. **La bajada:** "Partes de cero, practicas en tu navegador y armas un portafolio que puedes mostrar."
4. **La terminal jugable** (sección 4).
5. **Los botones:** el principal es "$ ./start · Crear cuenta gratis" (`/registro`); el secundario, "Ya tengo cuenta" (`/login`).

### Debajo del hero (opción "media")

1. **Los tres pasos**, en tarjetas mono:
   - `[01] aprendes`: clases cortas con práctica;
   - `[02] resuelves`: casos de empresas chilenas;
   - `[03] demuestras`: portafolio y certificado verificable.
2. **`$ cat data-analyst/`:**
   - el cargo y la descripción de la ruta abierta;
   - el recorrido "Excel → SQL → Python → Power BI → IA";
   - los conteos de casos y lecciones;
   - "No necesitas saber programar: partes de cero";
   - un botón "Empezar" que lleva a `/registro`.
   - **De dónde salen los datos:** del contenido, de la primera ruta publicada (`rutasParaPublicar`). Las lecciones se cuentan con las misiones de sus casos de tipo `clases`, sin números escritos a mano. Si no hay ninguna ruta publicada, la sección se omite.
3. **Las rutas que vienen,** en una sola línea: los slugs de las rutas filtradas, con el glitch actual (`typographic-glitch`) y "compilando". Las ocultas y los borradores no aparecen.
4. **`$ man syntaxerror`,** con tres preguntas y sus respuestas:
   - "¿Es gratis?": Sí, todo.
   - "¿Necesito saber algo antes?": No, partes de cero.
   - "¿Tengo que instalar algo?": No, todo corre en tu navegador.
5. **Un botón final,** igual al principal.

**Sale de la portada:** el carrusel de maquetas de la v1 (`CarruselPortada` y sus `maqueta-*`) y las tres tarjetas actuales. Si los componentes del carrusel no se usan en otra parte, se borran.

### Con sesión abierta

`/` llama a `auth()` y, si hay sesión, hace `redirect("/dashboard")`. La landing no se muestra.

## 4. La terminal jugable

### Contenido

- **La barra:** los tres puntos y `invitado@syntaxerror.cl: ~/reto`.
- **Al cargar se ve:**
  ```
  # tu primer reto: ¿cuánto vendió cada comuna?
  sql> SELECT comuna, SUM(monto) AS total FROM ventas GROUP BY comuna ORDER BY total DESC;
  ```
  La consulta está en un campo editable. Debajo va la línea de ayuda: "Enter para ejecutar · escribe help para ver comandos".
- **La tabla `ventas`:** 8 filas con `comuna`, `producto` y `monto`, escritas en el componente, con montos en pesos chilenos. Abarca las comunas Temuco, Ñuñoa, Valparaíso y Antofagasta. Los totales del resultado los calcula el motor; no se escriben a mano en ningún texto.

### Qué hace la entrada

| Entrada | Respuesta |
|---|---|
| Una consulta SQL (cualquier texto que no sea un comando) | Se ejecuta con `ejecutarSql` de `@syntaxerror/engines/sql` sobre `ventas`. Muestra la tabla de resultado y `[ok] N filas · lo resolviste en tu navegador`. Si hay un error, muestra la explicación de `explicarErrorSql` con el mismo formato de las tareas. |
| `help` o `ayuda` | La lista de comandos. |
| `ls rutas` | Las rutas como en la bienvenida: la abierta con su cargo y las filtradas con glitch. |
| `cat <ruta>` | El cargo y la descripción de la ruta, o su teaser si está filtrada. |
| `./start`, `start` o `registro` | Va a `/registro`. |
| `clear` | Limpia la salida. |
| `reset` | Vuelve a escribir la consulta inicial. |

- **Después de la primera ejecución correcta** se agrega la línea `> ./start para guardar tu avance y seguir con el reto 2`, con un botón para tocar.
- **En el celular** hay botones para tocar debajo de la entrada: `↵ ejecutar`, `help`, `ls rutas` y `./start`.

### Carga

- **La landing se renderiza en el servidor.** La terminal es un componente de cliente.
- **El motor SQL (alasql) no está en el bundle inicial:** se importa con `import()` la primera vez que la persona ejecuta algo. Mientras carga, la salida muestra `cargando motor sql…`.
- **Sin JavaScript** se ven el reto, la consulta y los botones de registro; lo único que no funciona es ejecutar.

### Lógica separada de la vista

Un módulo puro, `lib/portada/terminal.ts`, interpreta la entrada y devuelve qué mostrar. El componente solo dibuja la salida y ejecuta la consulta. Así los comandos se prueban sin navegador.

### Accesibilidad

- La terminal es una `section` con `aria-label="Terminal de prueba"`.
- La salida está en `aria-live="polite"` y la entrada tiene su etiqueta.
- Con `prefers-reduced-motion` no hay animaciones.

## 5. El panel como punto de entrada (`/dashboard`)

**Arriba siempre hay una tarjeta grande con el siguiente paso.** Se mantiene la estética de hoy (`> git checkout <ruta> · continuar`):

| Situación | La tarjeta | Botón principal |
|---|---|---|
| Tiene una lección o un caso en curso | Como hoy, "Continuar", con la barra de avance de la ruta | "Continuar lección" o "Ir al caso" (sin cambios) |
| Eligió una ruta y no empezó | `> git checkout <ruta>` · "Empieza: <primer paso>" | **"Empezar"**, que lleva a la **primera lección** de la ruta (`/casos/<primer caso>/<primera misión>`). Ya no lleva al mapa. |
| No eligió ruta y hay **una sola** ruta disponible | La misma tarjeta, con esa ruta | "Empezar tu primera lección", que lleva a la primera lección |
| No eligió ruta y hay varias | El selector de rutas, como hoy | (sin cambios) |

- **El mapa** queda como enlace secundario en la tarjeta: "Ver el mapa de la ruta".
- **Lo que se agrega:** `rutasParaSelectorUi` agrega a cada ruta `primerPasoHref`, la ruta de la primera misión del primer caso, o `null` si la ruta no tiene casos.

## 6. La bienvenida corta

- **Se mantiene** la terminal (`TerminalBienvenida`) con su estética, y se abre igual: la primera vez que entra un estudiante.
- **El arranque:** un saludo y tres líneas `[ok]`, alineadas con la landing:
  ```
  > hola, Valentina. iniciando syntaxError.cl…
  [ok] aprendes    clases cortas con práctica
  [ok] resuelves   casos de empresas chilenas
  [ok] demuestras  portafolio y certificado verificable
  ```
  Cada línea aparece cada 200 ms, en vez de 420. Ya no se teclea `ls rutas/` sola: el menú aparece al terminar las líneas. Con `prefers-reduced-motion`, todo aparece de una vez.
- **Las rutas elegibles** (publicadas, y en beta para quien tiene acceso) son opciones grandes. Cada una lleva el slug, el cargo y un botón **"↵ empezar"**. La primera elegible queda seleccionada, así que Enter la elige.
- **Las rutas filtradas** van debajo, juntas en un bloque más chico, con su glitch, `LEAK_0x..` y "compilando". No se pueden elegir.
- **Al elegir una ruta:**
  1. llama a `POST /api/cuenta/bienvenida` con la ruta, igual que hoy;
  2. escribe `[ok] ruta guardada · abriendo tu primera lección`;
  3. cierra la terminal y va a `primerPasoHref`. Si es `null`, va a `/rutas/<slug>`.
- **"explorar"** queda como un enlace chico, "ver el panel primero", que hace lo mismo que el comando actual.
- **Los comandos** (`help`, `ls`, `cat`, `elegir`, `explorar` y `clear`) siguen funcionando para quien escriba, pero ya no se anuncian como el camino principal.

## 7. Pruebas

- **Unitarias (`lib/portada/terminal.ts`):**
  - cada comando de la tabla;
  - un texto que no es comando se trata como SQL;
  - `./start` devuelve la navegación a `/registro`;
  - `reset` vuelve a la consulta inicial;
  - después de la primera ejecución correcta aparece la invitación a seguir.
- **Unitarias (`rutasParaSelectorUi`):** `primerPasoHref` con una ruta que tiene casos y con una ruta sin casos.
- **e2e:**
  1. Un visitante abre `/` y ejecuta el reto con Enter. Ve la tabla y `[ok]`, escribe una consulta con un error y ve su explicación. Toca `./start` y llega a `/registro`.
  2. Después de registrarse, la bienvenida corta muestra la ruta abierta. Un toque en "↵ empezar" lo lleva a la primera lección.
  3. Con sesión abierta, `/` redirige a `/dashboard`.
  4. Un estudiante que eligió ruta y no empezó ve "Empezar", que lleva a la primera lección.
- **Las e2e que cambian:** `portada.spec.ts`, `bienvenida.spec.ts` y el helper `cerrarBienvenida` de `fixtures.ts`, si depende del texto o de la secuencia anterior.
- **Capturas** de la landing, la bienvenida y el panel en claro, oscuro y celular (390 px), sin desplazamiento horizontal.
