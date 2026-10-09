# syntaxError: empieza de cero, construye tu próximo paso

Fecha: 2026-10-09. Estado: **primera maqueta elegida e implementada localmente**. Fuente de verdad visual: `docs/propuestas/landing-2026-10-09/index.html`, restaurado por el usuario. La revisión visual 02 fue descartada y no se integra.

[Abrir maqueta](../../propuestas/landing-2026-10-09/index.html) · [Diseño anterior](2026-10-09-landing-y-entrada-design.md)

## 1. Diagnóstico

La portada necesita que un principiante entienda qué aprenderá, crea que puede hacerlo y encuentre un siguiente paso evidente. La personalidad de syntaxError ya existe: práctica, terminal, errores como aprendizaje y conocimiento gratuito. Falta darle una jerarquía que invite a entrar.

Esta revisión se basa en el código de trabajo, el documento anterior, la identidad visual, el contenido de la ruta y el registro. Hay cambios locales previos en estos componentes: se conservan. No se dispone de analítica ni de entrevistas nuevas; las fricciones siguientes son observaciones de interfaz e hipótesis, no causas de abandono demostradas.

| Observación actual | Fricción probable | Cambio propuesto |
| --- | --- | --- |
| El primer botón de registro del hero aparece después del editor SQL y de ocho filas de datos. | La acción importante se descubre tarde, especialmente en celular. | Promesa, explicación breve y CTA antes de la demo en el orden del documento. |
| El visitante ve `SELECT`, `GROUP BY`, `help` y comandos desde el inicio. El botón para ejecutar solo aparece en móvil. | Alguien sin experiencia puede interpretar que necesita conocimientos previos o no encontrar cómo probar. | Ejemplo guiado con un botón visible en todos los tamaños. Código y comandos como exploración opcional. |
| «Entrar» tiene énfasis de botón primario en el encabezado. | El primer acceso visual conduce al login, no al comienzo del aprendizaje. | «Empezar gratis» como acción primaria; «Entrar» como enlace. |
| El resultado invita a «guardar tu avance y seguir con el reto 2», pero el componente solo navega a `/registro`. | La continuidad prometida no existe; la ruta realmente empieza con GitHub. | Decir «En la ruta aprenderás a hacerlo paso a paso» y explicar cuál es la primera actividad. |
| La FAQ dice que todo funciona sin instalar nada. | La expectativa no coincide con las actividades externas de la ruta. | «Puedes empezar desde el navegador» y aclarar GitHub y Power BI. |
| La oferta se expresa como herramientas y conteos. | Cuesta imaginar el resultado del esfuerzo. | Mostrar un entregable concreto: consultas, README, hallazgos y recomendaciones. |
| La historia del creador queda detrás de `sudo ./run_bio`. | La motivación humana de la gratuidad y el nombre queda oculta. | Un bloque breve de acompañamiento y enlace «Conoce por qué existe syntaxError». |
| En la captura local, `rutasPublicas[0]` selecciona Ciberseguridad, pero la tarjeta conserva «Excel → SQL → Python → Power BI → IA» y muestra cero casos. | La oferta pierde coherencia y credibilidad. | Elegir explícitamente la ruta promovida entre las accesibles y derivar su contenido. No asumir que la primera ruta del catálogo es Data Analyst. Este resultado local incluye borradores y no demuestra qué aparece en producción. |

Fuentes principales: `apps/web/src/app/(marketing)/page.tsx`, `apps/web/src/components/portada/terminal-jugable.tsx`, `apps/web/src/lib/portada/terminal.ts`, `apps/web/src/components/site-header.tsx`, `apps/web/src/app/(auth)/registro/RegisterForm.tsx`, `apps/web/src/app/(marketing)/lun4t1k0/page.tsx`, `content/rutas/data-analyst.yaml` y `README.md`. El grafo existente, fechado 2026-09-29, se usó para localizar los principios; las conclusiones actuales se contrastaron con los archivos.

## 2. Concepto: aquí puedes empezar

**Promesa:** aprender a trabajar con datos desde cero y construir proyectos que puedas mostrar.

**Idea de marca:** «Aquí, equivocarte también es aprender». Conecta directamente con el nombre syntaxError y con la historia de su creador. La terminal acompaña esa idea con detalles reconocibles; el lenguaje principal habla a una persona que todavía no sabe programar.

**Acción principal:** «Empezar gratis». Mismo nombre y destino desde encabezado, hero, ruta y cierre. En la aplicación abre `/registro`. El texto del registro debe hacer explícito que está creando una cuenta gratuita.

**Acción secundaria:** «Probar un ejemplo». Es opcional y lleva a una experiencia corta en la misma página. El visitante puede registrarse directamente sin completar la demo.

El alcance comercial es la ruta Data Analyst disponible para el visitante. No se prometen empleo, salarios, plazos de aprendizaje ni cifras de alumnos sin respaldo. Se habla de casos de práctica con contexto chileno, porque los datos de varios casos son generados; no se presentan empresas ficticias como clientes reales.

## 3. Recorrido y textos propuestos

### Encabezado

Logo completo en móvil y escritorio. En escritorio: «Cómo aprendes», «La ruta», tema, «Entrar» y «Empezar gratis». En móvil: logo, tema y «Entrar»; el CTA aparece inmediatamente en el hero. El encabezado simplificado aplica a marketing; el panel mantiene su navegación.

### Primera pantalla

Etiqueta: `> Aprende haciendo. Desde Chile.`

**Empieza de cero. Aprende a trabajar con datos.**

«De tu primera planilla a un proyecto que puedas mostrar. Aprende paso a paso, resuelve casos y construye tu portafolio. Gratis.»

Botón: **Empezar gratis ↗**. Enlace: **Probar un ejemplo ↓**.

Microtexto: «Desde cero · A tu ritmo · Sin tarjeta».

En escritorio, el texto ocupa la izquierda y una terminal compacta la derecha. En móvil, el CTA va antes de la terminal. El subtítulo explica el recorrido de aprendizaje; la sección de ruta aclara que la primera actividad operativa es GitHub.

### Una demostración sin intimidación

Título: «Los datos cuentan algo. Descúbrelo.»

Contexto: «Una tienda vende en cuatro comunas. ¿En cuál vendió más? Vamos a averiguarlo.»

Mostrar cuatro totales legibles, un gráfico pequeño y un botón «Descubrir la respuesta». Al tocar, ordenar los resultados, destacar la comuna con mayor venta y explicar qué se hizo. Los totales se calculan a partir de los mismos ocho registros de la portada actual.

Resultado: «[ok] Antofagasta vendió más: $574.000». Explicación: «Sumaste las ventas y encontraste una respuesta. En la ruta aprenderás a hacerlo paso a paso». El importe y la comuna siempre deben salir del cálculo, nunca de un texto fijo de producción.

«Ver cómo se hace con SQL» despliega la consulta y su explicación en español. En la implementación final puede abrir el editor existente como nivel adicional de exploración, manteniendo comandos y atajos. La maqueta solo demuestra el modo guiado mediante JavaScript; no es un motor SQL.

No calificar esto como una lección aprobada, no inventar progreso y no prometer que se guarda. Para alguien que ya sabe, el editor opcional conserva profundidad. Para quien empieza, una interacción basta para entender el tipo de experiencia.

### Cómo aprendes

«Aprende algo. Haz algo con eso.» Tres pasos breves:

1. **Una idea a la vez.** Clases con ejemplos y ejercicios.
2. **Un problema con contexto.** Ventas, despachos y decisiones.
3. **Algo que puedas mostrar.** Proyectos y conclusiones que puedas explicar.

### Una ruta concreta

«Tu punto de partida está aquí». Una sola ruta protagonista: **Analista de datos**.

Presentar el orden real: GitHub y portafolio → Excel → SQL → Python → Power BI → IA y proyecto final. Asociar cada herramienta a una actividad, no solo a un logo. No agregar un selector mientras haya una sola ruta abierta.

Texto de expectativa: «Empiezas preparando tu espacio de proyectos en GitHub». Aclaración visible de herramientas externas. No usar un número de semanas inventado; los conteos, si se incorporan, provienen del contenido publicado y ayudan a dimensionar el recorrido.

### Prueba tangible

«Mira lo que sé hacer». Una vista editorial de un entregable del caso Minimarkets del Sur: consultas `.sql`, un README y recomendaciones para gerencia. Etiquetar **EJEMPLO**, sin atribuirlo a un estudiante ni mostrar un certificado inventado.

Esta muestra permite entender qué significa «portafolio» antes de registrarse. La maqueta representa el formato del entregable, no un proyecto resuelto ni una reseña real.

### Acompañamiento e identidad

«No tienes que llegar sabiendo». Explicar pistas, tutor IA, preguntas al profesor y revisión de entregables. No prometer atención humana instantánea. Enlazar la historia del creador con palabras comprensibles y conservar un guiño de terminal.

### Dudas y cierre

FAQ: gratuidad, conocimientos previos, ritmo, herramientas externas y uso de celular. Respuestas cortas; las condiciones esenciales no quedan escondidas solo en acordeones.

Cierre: **«Tu primer intento ya es un comienzo»**. «Crea tu cuenta y empieza a construir algo tuyo». Botón «Empezar gratis».

Las rutas «compilando» pueden sobrevivir como detalle secundario al pie cuando corresponda, pero no interrumpen el camino hacia la ruta abierta. La maqueta las omite para concentrar el mensaje.

## 4. Dirección visual aprobada

Se implementa la primera maqueta restaurada en `index.html`: fondo carbón, violeta, títulos amplios, terminal compacta a la derecha, fila de tres pasos, ruta, ejemplo de portafolio, acompañamiento, preguntas y cierre. Se conserva la adaptación móvil y el tema claro.

Las fuentes de sistema, pesos, bordes, radios y espaciados se trasladan desde el HTML. Los estilos están aislados bajo `.landing-home`; las demás pantallas mantienen su diseño. No se importa `identidad.css` ni se incorporan ventanas superpuestas, manifiesto violeta, retículas o glitch de la revisión rechazada.

## 5. Del clic a ser alumno

La conversión útil es **completar la primera actividad**, además de crear una cuenta.

Flujo: «Empezar gratis» → registro → bienvenida con ruta disponible → «Empezar tu primera lección» → `herramientas-del-oficio/01-tu-primer-repositorio`.

Propuesta para el registro: título «Tu camino empieza aquí», subtítulo «Crea tu cuenta gratis para guardar tu progreso». Dar acceso visible a Google y al formulario existente. Cambiar «Password» por «Contraseña», explicar mínimo de ocho caracteres y usar «Crear cuenta gratis». Mantener las opciones de acceso existentes, sin nuevos cuestionarios de perfil o intereses.

La ruta se confirma en la bienvenida; no se salta la inscripción ni se fuerza un enlace a una lección que la persona no pueda usar. Con varias rutas abiertas, mantener elección. Con sesión, conservar redirección a `/dashboard`. Preservar el trabajo previo de entrada directa a la primera lección.

### Disponibilidad: condición para publicar esta propuesta

`data-analyst.yaml` tiene `estado: beta`. La elegibilidad también puede depender de estados administrados en base de datos. Además, `rutasParaPublicar()` se basa en contenido, mientras `rutasParaSelector()` consulta el estado vigente: la portada debe resolver esa diferencia antes de prometer acceso inmediato. El entorno local incluye borradores, así que una captura local no demuestra disponibilidad pública.

La maqueta representa explícitamente **el escenario con la ruta publicada**. Antes de integrar, usar una misma fuente de disponibilidad para promoción, bienvenida y autorización:

- Ruta publicada y accesible: usar la propuesta y su CTA de inicio.
- Solo beta restringida: informar «Ruta en beta» y mostrar únicamente un acceso que exista para esa audiencia. No dar a entender que crear cuenta habilita automáticamente la ruta.
- Ninguna ruta accesible: mantener el ejemplo público y explicar la situación. No mostrar «Empieza tu primera lección» ni inventar una lista de espera que todavía no existe.

## 6. Medición para validar la hipótesis

La propuesta visual no garantiza una mejora; se debe contrastar con comportamiento real. El diseño anterior excluía medición: aquí se propone como fase posterior explícita, no como instrumentación ya instalada.

Embudo mínimo: visita anónima agregada → clic en CTA → registro completado → primera lección abierta → primera actividad completada. Separar escritorio/móvil y la ubicación del CTA. La demo tiene señales adicionales: inicio y resultado mostrado.

Indicadores: registros por visita; alumnos que completan la primera actividad dentro de siete días de registrarse; proporción que abre la primera lección. Definir denominadores y evitar comparar cohortes que aún no cumplen los siete días. La interacción con la demo es secundaria: más clics no prueban mejor aprendizaje.

Priorizar datos agregados y eventos existentes del servidor, sin grabaciones de sesiones, fingerprinting ni herramientas ocultas. Esto respeta la promesa pública de syntaxError de no tener telemetría oculta. Si se añade medición de navegación, comunicarla y definir retención antes de publicarla.

Primero observar a cinco principiantes: qué creen que aprenderán, dónde empezarían y qué esperan tras registrarse. Después comparar con la línea base, manteniendo fuente de tráfico y estado de publicación comparables. No fijar porcentajes de mejora sin datos.

## 7. Alcance y aceptación de una futura implementación

Primera entrega: portada y encabezado público, demo guiada que reutiliza los datos actuales, textos de registro coherentes y revisión del paso a primera lección. Conservar rutas, controles de acceso, motores, progreso y cambios locales existentes. No requiere cambiar el currículo ni agregar servicios.

Criterios:

- Título, gratuidad y CTA visibles antes de la demo en móvil; «Entrar» secundario.
- Demo con botón accesible en escritorio y móvil; carga/error comprensibles al incorporar motor real.
- Rutas y promesas coherentes con el acceso de un visitante nuevo.
- No prometer persistencia de demo ni un «reto 2» inexistente.
- Sin desbordamiento horizontal a 320, 390, 768 y 1440 px; ambos temas.
- Navegación por teclado, foco visible, resultados anunciados y respeto por movimiento reducido.
- En la app real, contenido y CTA funcionan sin JavaScript; demo con alternativa estática y aviso si necesita JavaScript.
- Al ejecutar en Next.js: validación de tipos, pruebas existentes de portada y bienvenida adaptadas, verificación del registro y revisión con react-doctor.

## 8. Entregables de esta revisión

`docs/propuestas/landing-2026-10-09/index.html` es una maqueta local: abrir directamente en un navegador, manteniendo `identidad.css` en el mismo directorio. Incluye tema claro/oscuro, ejemplo calculado, preguntas desplegables y diálogos que explican el siguiente paso. Los diálogos de registro/login son exclusivos de la revisión; la aplicación final usará sus rutas existentes.

En el mismo directorio quedan capturas del estado local actual y de la propuesta, junto con `verificacion.json` con las comprobaciones de navegador. La maqueta no crea usuarios, no guarda progreso y no modifica producción.

### Verificación de la primera propuesta

Chromium, 2026-10-09. En el landing local, el CTA del hero empieza a 1.063 px en escritorio (1440 × 1000) y a 1.239 px en móvil (390 × 844). En la maqueta, el borde inferior del CTA queda a 688 px y 566 px respectivamente, incluida la banda de revisión. Es una mejora verificable de visibilidad, no una medición de conversión.

Se verificaron 320, 390, 768 y 1440 px en ambos temas, sin desbordamiento horizontal; el cálculo de la demo (Antofagasta, $574.000), apertura y cierre con Escape del recorrido de registro, FAQ, cambio de tema y movimiento reducido. Sin errores de JavaScript durante esas interacciones. Se revisaron visualmente las capturas. No se probaron registro ni progreso reales, porque esta entrega es una propuesta aislada de la aplicación.

### Verificación de la revisión visual 02

Se repitieron las comprobaciones en Chromium a 320, 390, 768 y 1440 px, con temas claro y oscuro. Sin desbordamiento horizontal ni errores de JavaScript. La demo, el diálogo de registro, Escape, las FAQ y el cambio de tema siguen funcionando. Se comprobó además que el glitch de los pseudoelementos queda desactivado con movimiento reducido.

El CTA del hero queda completo antes de 589 px en móvil de 390 × 844 y de 721 px en escritorio de 1440 × 1000, incluida la banda de revisión. Las capturas `propuesta-*` y `verificacion.json` corresponden ahora a esta revisión. Los valores de la primera propuesta se mantienen arriba como referencia histórica.


## 9. Implementación de la primera versión elegida

La portada real vive en `apps/web/src/app/(landing)/page.tsx`. Se separó del grupo `(marketing)` para usar el encabezado y pie del diseño elegido sin duplicar los compartidos ni cambiar otras páginas. La URL sigue siendo `/`.

- `components/portada/landing.css`: estilos de la primera maqueta, aislados del resto de la aplicación.
- `components/portada/demo-portada.tsx`: demo guiada con agregados de los ocho registros existentes; resultados calculados, explicación SQL desplegable y CTA real. Renderiza los datos iniciales en servidor; únicamente el descubrimiento interactivo necesita JavaScript.
- Los botones de registro y login van a `/registro` y `/login`; el origen a `/lun4t1k0`. Se mantienen privacidad, términos, carta de bienvenida y reporte de problemas en el pie.
- Se reutiliza el selector de tema de la plataforma. Desaparecen la banda de revisión y los diálogos simulados de la maqueta.
- La sesión autenticada sigue redirigiendo a `/dashboard`, conservando el flujo previo de bienvenida y primera lección.
- `lib/portada/disponibilidad.ts` selecciona explícitamente Data Analyst y usa su estado vigente. Si solo hay beta o aún no está abierta, informa la restricción y no promete acceso inmediato. No cambia estados de publicación ni permisos.
- Se conserva el formulario de registro existente. Esta implementación no incluye las mejoras futuras al formulario sugeridas en la sección 5.

La revisión visual 02 y sus capturas anteriores son antecedentes descartados. Las capturas de la implementación elegida quedan en `tmp/ux-audit/landing-implementada/`. No se realizó despliegue.

### Validación de la implementación

- TypeScript: `pnpm --filter web exec tsc --noEmit`, correcto.
- Unitarias de portada: 12 aprobadas (disponibilidad y módulo existente de terminal).
- Navegador: 7 pruebas de portada aprobadas, incluidas demo, registro real, primera lección, redirección de sesión, cuatro anchos, ambos temas y contenido sin JavaScript. Las 3 pruebas de autenticación y 2 de enlaces de origen también aprobaron en la ejecución anterior.
- React Doctor sobre los tres archivos nuevos de lógica/React: 100/100, sin incidencias.
- Capturas de móvil/escritorio y claro/oscuro revisadas. Sin desbordamiento horizontal ni errores JavaScript durante la revisión visual.
