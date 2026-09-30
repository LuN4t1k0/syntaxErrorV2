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
  }
}
