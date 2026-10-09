# Evaluación de homologación visual de syntaxError

Fecha: 2026-10-09. Estado: base visual compartida y ajustes prioritarios implementados y verificados localmente.
Referencia: primera maqueta elegida e implementada en `/`, según `docs/propuestas/landing-2026-10-09/index.html`. La segunda revisión visual fue descartada y no es referencia para este trabajo.

## Implementación realizada

Se aplicó la identidad de la primera portada al sistema compartido, con ajustes de composición en acceso y panel. Los hallazgos que siguen describen la revisión anterior al cambio.

- **Base común:** `packages/ui/src/tokens.css` concentra fondos, superficies, bordes y fuentes de sistema de la portada. La portada referencia esos mismos valores; conserva su composición y tamaños. `text-accent` usa violeta legible para enlaces y rótulos, mientras `bg-primary` conserva el violeta sólido de los botones. Los colores de sintaxis y la lógica de ejercicios se mantienen.
- **Controles:** `Button`, `buttonVariants` y `.btn` comparten variantes en `components.css`. Los tamaños distinguen herramientas, formularios (48 px) y promoción (52 px). Foco visible por teclado, tarjetas de 12 px y controles de tema coherentes. La portada mantiene sus reglas de composición para respetar la maqueta aprobada.
- **Acceso:** `SiteBrand` y `AccesoCard` unifican registro, login, recuperación y restablecimiento. Marca enlazada al inicio, explicación breve, «Contraseña», ayuda de longitud y «Crear cuenta gratis». Registro y login anuncian los errores con `role="alert"`. Se conservan credenciales, Google y destinos de regreso.
- **Navegación:** marca compartida, menú por rol y nombres accesibles en los enlaces que se muestran como iconos. En móviles la navegación autenticada ocupa una segunda fila para conservar acceso a todas las opciones.
- **Panel:** «Tu siguiente paso» recibe la mayor jerarquía. Rutas, casos, certificados y nivel preceden a beta y exploración. Las rutas futuras conservan su lenguaje de terminal con efectos más discretos en esa sección.
- **Mapa:** mantiene ramas y referencias Git, con estados «Completado», «En revisión» y «Bloqueado». Se corrigió el ancho mínimo de las columnas para evitar que un mensaje de commit largo desbordara en 320 px.
- **Resto del producto:** aulas, cuenta, comunidad, páginas públicas, administración y docencia reciben superficies, fuentes, controles y enlaces compartidos. Las composiciones especializadas, tablas y consolas conservan su densidad. No se rediseñó el PDF del certificado ni se modificaron permisos, contenido o motores como parte de esta homologación.

### Continuación en el resto del frontend

- `PageIntro` da una estructura común a perfil, mensajes, preguntas y clases sin cambiar sus rutas ni sus datos. `EmptyState` explica qué hacer cuando todavía no hay mensajes, preguntas o clases y ofrece un enlace útil.
- `AdminNav` marca la sección actual con `aria-current="page"`. En móvil pasa a una fila desplazable; conserva acceso a las diez secciones y evita una columna larga de enlaces antes del contenido.
- `Feedback` y los tokens de texto de éxito/error dan estados visuales y semánticos consistentes a cuenta y comunidad. Las tareas aprobadas muestran un estado verde legible en claro y oscuro; los errores se anuncian como alertas. Los botones conservan el color de acción de la portada.
- Textareas y selectores de aulas, reportes, búsqueda, docencia y administración usan `.field`; así comparten borde, fondo y foco visible. El registro y el login muestran un error de conexión recuperable y liberan sus botones si falla la petición.
- Los reportes y la verificación pública de certificados usan ahora el encabezado y las superficies compartidas; la verificación añade un estado verde explícito. El diálogo de confirmación de administración es nativo, conserva el foco y se cierra con Escape. El enlace de descarga indica el nombre completo del PDF.
- La composición de las lecciones, los editores, el asistente, las tablas, el portafolio público y los paneles docentes sigue adaptada a su uso. Se revisaron visualmente perfil, bandeja, preguntas, clases, administración y una lección a 390 px en ambos temas, además de administración a 320, 768 y 1440 px. Evidencia local: `tmp/ux-audit/homologacion-resto/` (15 capturas, sin desbordes ni errores de JavaScript).

### Verificación de esta implementación

- TypeScript: `pnpm --filter web exec tsc --noEmit`, sin errores.
- UI: 3 pruebas de `Button` aprobadas.
- Navegador: 31 pruebas E2E distintas aprobadas entre portada, acceso, bienvenida, cuenta, certificados/portafolio, mapa, misiones, consolas y administración. La primera tanda tuvo 29 aprobadas y una desconexión del servidor local (`ERR_CONNECTION_REFUSED`) al volver al panel tras cerrar sesión. La repetición de acceso y mapa aprobó las 6 pruebas, incluida la nueva comprobación de foco por teclado en ambos temas y el mapa a 320 px.
- Revisión visual: 14 páginas en 17 vistas de escritorio/móvil, más 17 combinaciones adicionales de ancho y tema, sin desbordamiento horizontal. Registro, login, recuperación y mapa comprobados a 320 px; panel con navegación administrativa a 320, 640, 768 y 1024 px en claro y oscuro. Evidencia local: `tmp/ux-audit/homologacion-implementada/`, `revision.json` y `responsive.json`.
- Portada: revisada a 390 y 1440 px en claro y oscuro, y E2E también a 320 y 768 px. Las capturas conservan las dimensiones y composición originales. Comparación en `tmp/ux-audit/landing-homologada/`; el indicador de desarrollo introduce diferencias ajenas al diseño.
- Continuación funcional: pasaron registro, login, cierre de sesión, error de conexión recuperable, unión a clases y su error, envío de reportes, navegación y confirmación por teclado en administración, certificados PDF/portafolio y misiones. La prueba integral de cuenta detectó un nombre de descarga `pdf`; tras indicar `certificado-CÓDIGO.pdf` en el enlace, ese recorrido pasó. Se eliminó una actualización de la página inmediatamente después de navegar desde acceso para evitar una transición intermitente; las seis pruebas finales de acceso y clase pasaron.
- Continuación visual: 15 capturas de perfil, mensajes, preguntas, clases, administración y aula en claro/oscuro y distintos anchos, sin errores de JavaScript ni desbordes; también se revisaron reporte y diálogo en ambos temas.
- React Doctor: los dos componentes nuevos obtuvieron 100/100. El análisis inicial de archivos modificados reportó una advertencia por `buttonVariants`, función que ya se exportaba junto al componente `Button`. Un barrido ampliado de 106 archivos señaló advertencias adicionales de arquitectura y patrones anteriores a esta homologación; no reportó errores. Se corrigieron las observaciones directamente ligadas a este cambio en registro, etiquetado de controles y confirmación modal. Los cuatro componentes nuevos de esta continuación obtuvieron 100/100 al revisarlos de forma aislada.

Esto verifica los recorridos anteriores y las vistas capturadas; no constituye una auditoría exhaustiva de accesibilidad ni mide conversión. La validación OAuth externa de Google y la inspección visual del PDF quedan fuera de esta revisión. La implementación está en el entorno local, sin despliegue.

## Recomendación

**Sí conviene homologar la identidad y los componentes del producto.** Hacerlo gradualmente, conservando la composición que necesita cada tarea. La portada aporta calma, jerarquía y claridad; el aula necesita además densidad, herramientas y estados inequívocos. Administración necesita rapidez para revisar información.

No recomiendo una sustitución global de estilos ni extender `.landing-home` a toda la aplicación. Propongo extraer las decisiones aprobadas a `packages/ui`, probarlas en registro y panel, y luego extenderlas. No hace falta modificar motores, currículo, progreso, permisos ni base de datos.

## Alcance de la revisión

Se inventariaron **41 archivos de página** y se revisaron tokens, componentes UI, layouts, formularios, mapa de rutas, tareas y editor. El grafo existente sirvió de orientación arquitectónica; está fechado 2026-09-29, por lo que los hallazgos se contrastaron con código actual.

Se capturaron **14 páginas distintas en 17 vistas**: portada, registro, login, recuperación, catálogo de rutas, mapa Data Analyst, primera lección, lección SQL, origen, panel, perfil, mensajes, administración y docencia; además mapa y primera lección en móvil, y perfil en claro. Evidencia: `tmp/ux-audit/homologacion/`, con medidas en `revision.json`.

La navegación autenticada se hizo con la cuenta administrativa de prueba local. Su menú y contenido no representan exactamente los de un alumno nuevo. La bienvenida se revisó por código y por el recorrido validado durante la implementación anterior. Portafolio público y certificados se revisaron por código, sin generar registros para producir capturas. No es una auditoría exhaustiva de accesibilidad ni una prueba de todos los estados funcionales. No se enviaron formularios de modificación ni se cambiaron configuraciones durante esta revisión.

## Hallazgos

### 1. La discontinuidad más importante está al registrarse

La portada incluye marca visible, promesa, explicación del siguiente paso y una acción dominante. El registro pasa a una tarjeta aislada, sin logo o enlace de regreso visibles, con título «Crear cuenta», «Password» y «Crear y entrar». Login tiene otra introducción (`auth_gate_ estudiantes`); recuperación vuelve a usar el encabezado general.

Conviene unificar las tres como una familia: marca, posición del cambio de tema, superficie, ancho y lenguaje. Añadir contexto breve sobre la cuenta gratuita y usar «Contraseña». Mantener el formulario corto, Google y credenciales, sus validaciones y sus destinos actuales. No añadir una columna publicitaria extensa ni preguntas de perfil.

Fuentes: `(auth)/registro/RegisterForm.tsx`, `(auth)/login/LoginForm.tsx`, `(cuenta)/recuperar-clave/page.tsx`.

### 2. Hay dos sistemas visuales, aunque la identidad base ya coincide

| Elemento | Portada elegida | Resto del producto |
| --- | --- | --- |
| Fondo oscuro | `#09090b` | `#09090b` |
| Superficie principal | `#121215` | `#18181b` |
| Superficie elevada | `#1a191f` | `#27272a` |
| Texto de acento oscuro | `#a78bfa` | Habitualmente `--primary`, `#7c3aed` |
| Botón primario | `#7c3aed` | `#7c3aed` |
| Tipografía de interfaz | Fuentes de sistema del HTML aprobado | Geist |
| Tipografía de código | Mono de sistema | Geist Mono |
| Acción principal de portada | 52 px mínimos | Controles generales de 40 px; variantes pequeñas de 36 px |
| Tarjetas | Radios según función, entre 7 y 12 px | Base de 8 px |

Las diferencias pequeñas no son defectos por sí mismas. El problema es que están definidas por separado y pueden divergir con el tiempo. Se necesita una fuente común con variantes deliberadas.

Fuentes: `components/portada/landing.css`, `packages/ui/src/tokens.css`, `packages/ui/src/components.css`.

### 3. Separar texto de acento y relleno del botón mejora legibilidad

Cálculo de contraste a partir de los colores definidos, sin transparencias:

- `#7c3aed` sobre `#09090b`: **3,49:1**.
- `#7c3aed` sobre `#18181b`: **3,11:1**.
- `#a78bfa` sobre `#09090b`: **7,31:1**.
- Blanco sobre `#7c3aed`: **5,70:1**.

Actualmente un mismo `--primary` se usa para fondos de botones, enlaces y etiquetas pequeñas. Cambiarlo a violeta claro globalmente perjudicaría el contraste del texto blanco de los botones. Conviene mantener un token para acción sólida y añadir otro para enlaces/texto de acento, con valores específicos para claro y oscuro.

Esto afecta, entre otros, enlaces de regreso de las lecciones, comandos del panel y enlaces del perfil. Los estados de error, advertencia y éxito deben conservar colores y etiquetas propios.

### 4. La UI compartida permite una migración controlada

El componente `<Button>` aparece en 49 archivos TSX. Coexiste con clases `.btn` y con `.button` de la portada; las definiciones de tamaños y estados se repiten. `Card` e `Input` ya delegan en clases comunes, lo que facilita la consolidación.

Unificar las variantes de botón y enlace con aspecto de botón: principal, secundaria, discreta y destructiva. Definir tamaños de promoción, formulario y herramienta. No hacer que cada botón de «Ejecutar» o cada filtro mida lo mismo que el CTA del hero.

Revisar foco por teclado durante esta consolidación: `buttonVariants` incluye `focus-visible:outline-none`, mientras el estilo global define un contorno. Hace falta comprobar el resultado compuesto, no asumir que una captura con ratón garantiza foco visible.

### 5. El panel necesita jerarquía más que decoración

La captura local muestra «Continuar», rutas propias, beta, rutas futuras, casos, certificados y nivel en una columna larga. Las tarjetas comparten un peso visual parecido; las rutas futuras tienen efectos más expresivos que la tarea actual.

Haría protagonista el siguiente paso y su avance. Después, contenido del alumno. Las rutas futuras y la exploración quedarían en una zona secundaria. La cantidad de contenido depende de la cuenta; antes de cerrar este cambio hay que comparar alumno nuevo, alumno activo y alumno con casos completados.

Conservar los destinos actuales de continuar y el paso directo a la primera lección. La homologación visual no debería volver a introducir pasos intermedios.

Fuente: `(dashboard)/dashboard/page.tsx` y `components/rutas/selector-rutas.tsx`.

### 6. El mapa y el aula tienen motivos para verse distintos

El mapa representa progreso con ramas, nodos, bloqueos, revisiones y entregables. Tiene una identidad propia útil. Se pueden armonizar las tarjetas y los textos, y poner estados comprensibles («Completado», «En revisión», «Bloqueado») junto a los guiños Git. La necesidad de conocer `HEAD`, `merged` o `LOCKED` debe ser mínima.

El aula combina lectura, ejemplos, editor, validación, pistas y ayuda. Sus anchos más estrechos, tipografía monoespaciada, desplazamiento de tablas y colores de sintaxis cumplen una función. Conservarlos. Adoptar superficies y controles comunes, revisar contraste y reducir el peso de rótulos secundarios; evitar títulos del tamaño del hero, grandes espacios entre cada bloque y efectos durante la lectura.

El asistente flotante y la ayuda al tutor/docente necesitan una revisión específica de prioridades, especialmente en móvil; no es algo que se resuelva cambiando colores.

Fuentes: `components/rutas/mapa-ruta.tsx`, `(misiones)/casos/[caso]/[mision]/page.tsx`, `components/mision/panel-tarea.tsx`, `components/consola/motor-editor.tsx` y `components/mision/tabla-resultado.tsx`.

## Qué homologar por área

| Área | Intensidad propuesta | Resultado buscado |
| --- | --- | --- |
| Registro, acceso, recuperación | Alta; primera prioridad | Continuidad inmediata desde la portada y claridad del siguiente paso. |
| Encabezados y pies | Alta en marca y controles | Logo, alineación, tema y lenguaje consistentes, con navegación propia por contexto y rol. |
| Panel del alumno y bienvenida | Alta en jerarquía, moderada en estructura | Acción de continuar evidente; menos competencia visual. Conservar terminal breve y atajos opcionales. |
| Catálogo, mapa y fichas de casos | Moderada | Misma familia de superficies y títulos, conservando el progreso y los bloqueos. |
| Perfil, mensajes, preguntas y clases | Alta en componentes | Formularios, avisos, estados vacíos y acciones coherentes. |
| Lecciones y consolas | Selectiva | Lectura y práctica cómodas; herramientas y colores semánticos preservados. |
| Páginas públicas y portafolio | Alta | Continuidad de marca en las páginas que se comparten con terceros. |
| Administración y docencia | Base común, densidad propia | Formularios y tablas consistentes, conservando navegación y eficiencia operativa. |
| Certificados | Limitada y específica | Marca consistente, manteniendo impresión, PDF, verificación y presentación formal. |

## Secuencia recomendada

1. **Base compartida y piloto en registro.** Extraer colores, tipografía y variantes de controles sin alterar visualmente la portada aprobada. Llevar el registro, login y recuperación a esa base. Comprobar claro/oscuro, teclado, errores y móvil.
2. **Panel y primera experiencia.** Ajustar jerarquía, encabezado, bienvenida, rutas y continuidad a la primera actividad. Revisar tres estados de progreso con cuentas de prueba.
3. **Aula y cuenta.** Aplicar tokens y componentes gradualmente a lecciones, perfil, mensajes y preguntas. Validar editores SQL/Python, planillas, lectura, pistas y bloqueos.
4. **Superficies restantes.** Páginas institucionales, portafolio, docencia y administración. Revisar certificados web y PDF por separado.

Cada fase debe ser pequeña y verificable. No recomiendo hacer las 41 páginas en un solo cambio ni sustituir masivamente `font-black`, `.card` o `--primary`.

## Criterios para aceptar una homologación

- La portada elegida conserva su apariencia; no vuelve la segunda propuesta descartada.
- Mismo lenguaje visual en marca, fondos, textos, controles, enlaces, foco y estados.
- Tamaños y densidad elegidos por tarea, no impuestos por una única plantilla.
- Cambios de tema consistentes; errores y éxito se reconocen también por texto.
- Teclado, diálogos, móviles y movimiento reducido comprobados.
- Registro, bienvenida, continuación, validación, entregables y permisos siguen funcionando.
- Comparación visual antes/después de cada fase y pruebas funcionales pertinentes.

El beneficio esperado es una experiencia más continua y legible. La revisión no demuestra por sí sola una mejora de conversión o retención; eso requiere observar estudiantes y medir el recorrido.
