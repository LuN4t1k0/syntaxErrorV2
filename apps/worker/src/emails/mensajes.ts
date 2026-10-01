import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { plantillaSyntaxError, type EmailListo } from "./plantilla";

function saludo(nombre: string | null): string {
  const limpio = nombre?.trim();
  return limpio ? `Hola, ${limpio}:` : "Hola:";
}

export function construirEmail(trabajo: TrabajoEmail): EmailListo {
  switch (trabajo.tipo) {
    case "verificar-email":
      return plantillaSyntaxError({
        asunto: "Confirma tu email",
        estado: { etiqueta: "INFO", mensaje: "Cuenta creada" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Te damos la bienvenida a syntaxError.cl. Tu cuenta ya está lista y puedes empezar tu primer caso cuando quieras.",
          "Confirma que este email es tuyo: así te podemos enviar tus certificados y los avisos importantes de tu cuenta.",
        ],
        enlace: { texto: "Confirmar mi email", url: trabajo.enlace },
        comandoCierre: 'git commit -m "primer día"',
      });
    case "confirmar-nuevo-email":
      return plantillaSyntaxError({
        asunto: "Confirma tu nuevo email",
        estado: { etiqueta: "INFO", mensaje: "Confirmación de email pendiente" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Recibimos una solicitud para usar este email en tu cuenta de syntaxError.cl.",
          "Si fuiste tú, confirma el cambio con el botón. Si no, ignora este correo: tu cuenta sigue igual.",
        ],
        enlace: { texto: "Confirmar nuevo email", url: trabajo.enlace },
        comandoCierre: "git checkout -b nuevo-email",
      });
    case "aviso-cambio-email":
      return plantillaSyntaxError({
        asunto: "Pidieron cambiar el email de tu cuenta",
        estado: { etiqueta: "WARNING", mensaje: "Solicitud de cambio de email" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Se pidió cambiar el email de tu cuenta a ${trabajo.nuevoEmail}.`,
          "El cambio solo se hace cuando se confirma desde ese nuevo email. Si no fuiste tú, cambia tu contraseña de inmediato.",
        ],
        comandoCierre: "git log --oneline",
      });
    case "clave-cambiada":
      return plantillaSyntaxError({
        asunto: "Tu contraseña fue actualizada",
        estado: { etiqueta: "INFO", mensaje: "Contraseña actualizada" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Te confirmamos que la contraseña de tu cuenta fue actualizada.",
          "Si no fuiste tú, responde este correo de inmediato para que te ayudemos a recuperar tu cuenta.",
        ],
        comandoCierre: "passwd --confirm",
      });
    case "recuperar-clave":
      return plantillaSyntaxError({
        asunto: "Restablece tu contraseña",
        estado: { etiqueta: "INFO", mensaje: "Solicitud de contraseña nueva" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Recibimos una solicitud para elegir una contraseña nueva en tu cuenta de syntaxError.cl. El enlace dura una hora y sirve una sola vez.",
          "Si no la pediste tú, ignora este correo: tu contraseña sigue igual.",
        ],
        enlace: { texto: "Elegir una contraseña nueva", url: trabajo.enlace },
        comandoCierre: "passwd",
      });
    case "cuenta-eliminada":
      return plantillaSyntaxError({
        asunto: "Tu cuenta fue eliminada",
        estado: { etiqueta: "WARNING", mensaje: "Cuenta eliminada" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Tu cuenta en syntaxError.cl fue eliminada de forma permanente.",
          "Se borraron tu progreso, tus entregables, tus certificados y tu portafolio. Si crees que fue un error, responde este correo.",
        ],
        comandoCierre: "sudo rm -rf ~/cuenta",
      });
    case "certificado-emitido":
      return plantillaSyntaxError({
        asunto: "Obtuviste un certificado",
        estado: { etiqueta: "INFO", mensaje: "Certificado emitido" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Completaste ${trabajo.titulo}. ¡Felicitaciones!`,
          "Tu certificado tiene un código único que cualquier empresa puede verificar en línea. Agrégalo a tu CV y a tu LinkedIn.",
        ],
        enlace: { texto: "Ver mi certificado", url: trabajo.enlace },
        comandoCierre: "git tag v1.0",
      });
    case "pregunta-profesor-nueva":
      return plantillaSyntaxError({
        asunto: "Tienes una pregunta nueva",
        estado: { etiqueta: "INFO", mensaje: "Pregunta de estudiante" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.alumno} preguntó en la misión «${trabajo.mision}» del caso ${trabajo.caso}:`, `«${trabajo.pregunta}»`],
        enlace: { texto: "Responder la pregunta", url: trabajo.enlace },
        comandoCierre: "git pull origin preguntas",
      });
    case "pregunta-profesor-respondida":
      return plantillaSyntaxError({
        asunto: "Respondieron tu pregunta",
        estado: { etiqueta: "INFO", mensaje: "Pregunta respondida" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Tu pregunta en la misión «${trabajo.mision}» del caso ${trabajo.caso} ya tiene respuesta.`,
          `Preguntaste: «${trabajo.pregunta}»`,
          `Respuesta: ${trabajo.respuesta}`,
        ],
        enlace: { texto: "Ver mis preguntas", url: trabajo.enlace },
        comandoCierre: "git merge respuesta",
      });
    case "resena-nueva":
      return plantillaSyntaxError({
        asunto: "Hay una reseña por moderar",
        estado: { etiqueta: "INFO", mensaje: "Reseña con comentario" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Dejaron ${trabajo.estrellas} de 5 estrellas en el caso ${trabajo.caso}, con este comentario:`,
          `«${trabajo.comentario}»`,
          "El comentario queda oculto hasta que alguien de administración lo apruebe.",
        ],
        comandoCierre: "git review",
      });
    case "reporte-nuevo":
      return plantillaSyntaxError({
        asunto: trabajo.tipoReporte === "error" ? "Reportaron un error" : "Llegó una sugerencia",
        estado: trabajo.tipoReporte === "error" ? { etiqueta: "WARNING", mensaje: "Reporte de error" } : { etiqueta: "INFO", mensaje: "Sugerencia" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.autor} escribió desde ${trabajo.pagina}:`, `«${trabajo.descripcion}»`],
        comandoCierre: "git issue create",
      });
    case "solicitud-docente-nueva":
      return plantillaSyntaxError({
        asunto: "Pidieron acceso docente",
        estado: { etiqueta: "INFO", mensaje: "Solicitud docente" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.solicitante} pidió acceso docente en syntaxError.cl.`, "Revisa la solicitud desde administración para aprobarla o rechazarla."],
        comandoCierre: "sudo usermod -aG docentes",
      });
    case "clase-solicitud":
      return plantillaSyntaxError({
        asunto: "Pidieron entrar a tu clase",
        estado: { etiqueta: "INFO", mensaje: "Solicitud de inscripción" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.alumno} pidió entrar a tu clase «${trabajo.clase}».`, "Acepta o rechaza la solicitud desde tu panel docente."],
        enlace: { texto: "Ver mi clase", url: trabajo.enlace },
        comandoCierre: "git remote add estudiante",
      });
    case "clase-decision":
      return plantillaSyntaxError({
        asunto: trabajo.aceptada ? "Te aceptaron en la clase" : "Ya no estás en la clase",
        estado: trabajo.aceptada ? { etiqueta: "INFO", mensaje: "Inscripción aceptada" } : { etiqueta: "WARNING", mensaje: "Inscripción cerrada" },
        saludo: saludo(trabajo.nombre),
        parrafos: trabajo.aceptada
          ? [`Ya eres parte de la clase «${trabajo.clase}».`, "Tus preguntas sobre los casos de la clase le llegan a tu docente."]
          : [
              `Tu docente cerró tu inscripción en la clase «${trabajo.clase}».`,
              "Puedes seguir con los casos por tu cuenta, y tus preguntas le llegarán al equipo de syntaxError.cl.",
            ],
        enlace: { texto: "Ver mis clases", url: trabajo.enlace },
        comandoCierre: "git checkout clase",
      });
    case "entregable-por-revisar":
      return plantillaSyntaxError({
        asunto: "Hay un entregable por revisar",
        estado: { etiqueta: "INFO", mensaje: "Entregable en revisión" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.alumno} envió su entregable del caso ${trabajo.caso}.`, "Revísalo con la rúbrica del caso para aprobarlo o pedir cambios."],
        enlace: { texto: "Revisar entregables", url: trabajo.enlace },
        comandoCierre: "git diff --review",
      });
    case "entregable-observado":
      return plantillaSyntaxError({
        asunto: "Tu entregable necesita cambios",
        estado: { etiqueta: "WARNING", mensaje: "Entregable con observaciones" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`Revisaron tu entregable del caso ${trabajo.caso} y te piden algunos cambios:`, `«${trabajo.comentario}»`, "Haz los ajustes en tu repositorio y vuelve a enviarlo desde la página del caso."],
        enlace: { texto: "Ir al caso", url: trabajo.enlace },
        comandoCierre: "git commit --amend",
      });
    case "mensaje-nuevo":
      return plantillaSyntaxError({
        asunto: "Tienes un mensaje nuevo",
        estado: { etiqueta: "INFO", mensaje: "Mensaje nuevo" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`Te escribieron desde syntaxError.cl: «${trabajo.asunto}».`],
        enlace: { texto: "Leer el mensaje", url: trabajo.enlace },
        comandoCierre: "cat ~/mensajes",
      });
  }
}
