import type { AuditAction } from "@syntaxerror/db/audit";
import type { Rol } from "@/lib/roles";

export const ETIQUETAS_ROL: Record<Rol, string> = { student: "Estudiante", teacher: "Docente", admin: "Administración" };

export const ETIQUETAS_ACCION: Record<AuditAction, string> = {
  login_success: "Inicio de sesión",
  login_failed: "Inicio de sesión fallido",
  logout: "Cierre de sesión",
  email_verified: "Email confirmado",
  profile_updated: "Perfil actualizado",
  password_changed: "Contraseña cambiada",
  password_reset: "Contraseña restablecida",
  email_change_requested: "Cambio de email pedido",
  email_changed: "Email cambiado",
  data_exported: "Datos exportados",
  account_deleted: "Cuenta eliminada",
  portfolio_updated: "Portafolio actualizado",
  role_changed: "Rol cambiado",
  teacher_question_answered: "Pregunta a docente respondida",
  review_moderated: "Reseña moderada",
  teacher_request_decided: "Solicitud docente resuelta",
  report_resolved: "Reporte resuelto",
  tutor_cache_deleted: "Respuesta del tutor borrada",
  deliverable_reviewed: "Entregable revisado",
};
