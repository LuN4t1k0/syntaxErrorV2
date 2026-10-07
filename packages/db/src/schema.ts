import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("student"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    abandonmentEmailsOptOut: boolean("abandonment_emails_opt_out")
      .notNull()
      .default(false),
    usuario: text("usuario"),
    portafolioPublico: boolean("portafolio_publico").notNull().default(false),
    // Probador: hace las rutas en el orden que quiera y entra a las rutas en beta. Lo marca un admin.
    probador: boolean("probador").notNull().default(false),
    // La primera entrada: cuándo vio la terminal de bienvenida y qué ruta eligió (una inscripción liviana).
    bienvenidaVistaEn: timestamp("bienvenida_vista_en"),
    rutaElegida: uuid("ruta_elegida").references((): AnyPgColumn => rutas.id, { onDelete: "set null" }),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email), uniqueIndex("users_usuario_idx").on(table.usuario)]
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

// Ajustes generales de la plataforma que cambia un admin, por ejemplo el orden libre de las rutas para todos.
export const ajustes = pgTable("ajustes", {
  clave: text("clave").primaryKey(),
  valor: jsonb("valor").notNull(),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  actualizadoPor: uuid("actualizado_por").references(() => users.id, { onDelete: "set null" }),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    actorId: uuid("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [index("audit_log_created_at_idx").on(table.createdAt)]
);

export type MisionResumen = { slug: string; titulo: string; tareas: string[] };

export const rutas = pgTable(
  "rutas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    titulo: text("titulo").notNull(),
    cargo: text("cargo").notNull(),
    descripcion: text("descripcion").notNull(),
    teaser: text("teaser"),
    estado: text("estado").notNull().default("borrador"),
    estadoAdmin: text("estado_admin"),
    estadoCambiadoPor: uuid("estado_cambiado_por").references(() => users.id, { onDelete: "set null" }),
    estadoCambiadoEn: timestamp("estado_cambiado_en"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rutas_slug_idx").on(table.slug)]
);

export const casos = pgTable(
  "casos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    // "caso" (con entregable) o "clases" (lecciones de las aulas de la v1, sin entregable).
    tipo: text("tipo").notNull().default("caso"),
    titulo: text("titulo").notNull(),
    cargo: text("cargo").notNull(),
    empresa: text("empresa").notNull(),
    entregable: text("entregable").notNull(),
    misiones: jsonb("misiones").notNull().$type<MisionResumen[]>().default([]),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("casos_slug_idx").on(table.slug)]
);

export const rutaCasos = pgTable(
  "ruta_casos",
  {
    rutaId: uuid("ruta_id")
      .notNull()
      .references(() => rutas.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    orden: integer("orden").notNull(),
  },
  (table) => [primaryKey({ columns: [table.rutaId, table.casoId] })]
);

export const misionProgreso = pgTable(
  "mision_progreso",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    mision: text("mision").notNull(),
    estado: text("estado").notNull().default("en_curso"),
    intentos: integer("intentos").notNull().default(0),
    fallidos: integer("fallidos").notNull().default(0),
    tareasAprobadas: jsonb("tareas_aprobadas").notNull().$type<string[]>().default([]),
    aprobadaEn: timestamp("aprobada_en"),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.casoId, table.mision] })]
);

export const casoInscripciones = pgTable(
  "caso_inscripciones",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    inscritoEn: timestamp("inscrito_en").notNull().defaultNow(),
    completadoEn: timestamp("completado_en"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.casoId] })]
);

export const rutaInscripciones = pgTable(
  "ruta_inscripciones",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rutaId: uuid("ruta_id")
      .notNull()
      .references(() => rutas.id, { onDelete: "cascade" }),
    inscritoEn: timestamp("inscrito_en").notNull().defaultNow(),
    completadoEn: timestamp("completado_en"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.rutaId] })]
);

export const entregables = pgTable(
  "entregables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    // pendiente -> (revisión con rúbrica) -> aprobado u observado. Solo aprobado completa el caso.
    estado: text("estado").notNull().default("pendiente"),
    verificadoEn: timestamp("verificado_en"),
    comentario: text("comentario"),
    // Puntaje de 1 a 3 en cada dimensión de la rúbrica estándar, y el comentario de cada dimensión que lo tenga.
    puntajes: jsonb("puntajes").notNull().$type<Partial<Record<string, number>>>().default({}),
    observaciones: jsonb("observaciones").notNull().$type<Partial<Record<string, string>>>().default({}),
    revisadoPor: uuid("revisado_por").references(() => users.id, { onDelete: "set null" }),
    revisadoEn: timestamp("revisado_en"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("entregables_usuario_caso_idx").on(table.userId, table.casoId)]
);

export const tokensEmail = pgTable(
  "tokens_email",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiraEn: timestamp("expira_en").notNull(),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tokens_email_hash_idx").on(table.tokenHash)]
);

export const certificados = pgTable(
  "certificados",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    casoId: uuid("caso_id").references(() => casos.id, { onDelete: "set null" }),
    rutaId: uuid("ruta_id").references(() => rutas.id, { onDelete: "set null" }),
    codigo: text("codigo").notNull(),
    nombreAlumno: text("nombre_alumno").notNull(),
    titulo: text("titulo").notNull(),
    cargo: text("cargo"),
    emitidoEn: timestamp("emitido_en").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("certificados_codigo_idx").on(table.codigo),
    uniqueIndex("certificados_usuario_caso_idx").on(table.userId, table.tipo, table.casoId),
    uniqueIndex("certificados_usuario_ruta_idx").on(table.userId, table.tipo, table.rutaId),
  ]
);

// Foto fija de los certificados de la v1: la llena scripts/migrar-v1.ts (Fase 5).
export const certificadosLegacy = pgTable("certificados_legacy", {
  codigo: text("codigo").primaryKey(),
  nombreAlumno: text("nombre_alumno").notNull(),
  titulo: text("titulo").notNull(),
  tipo: text("tipo").notNull(),
  emitidoEn: timestamp("emitido_en").notNull(),
});

export const tutorCache = pgTable(
  "ai_chat_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    mision: text("mision").notNull(),
    pregunta: text("pregunta").notNull(),
    respuesta: text("respuesta").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [
    index("ai_chat_cache_mision_idx").on(table.casoId, table.mision),
    index("ai_chat_cache_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ]
);

export const tutorPreguntas = pgTable(
  "ai_chat_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    mision: text("mision").notNull(),
    pregunta: text("pregunta").notNull(),
    respuesta: text("respuesta"),
    estado: text("estado").notNull(),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    respondidaEn: timestamp("respondida_en"),
  },
  (table) => [index("ai_chat_questions_usuario_idx").on(table.userId, table.creadoEn)]
);

export const transaccionesPuntos = pgTable(
  "point_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    clave: text("clave").notNull(),
    motivo: text("motivo").notNull(),
    cantidad: integer("cantidad").notNull(),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("point_transactions_logro_idx").on(table.userId, table.casoId, table.clave),
    index("point_transactions_usuario_idx").on(table.userId),
  ]
);

export const solicitudesDocente = pgTable(
  "teacher_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    estado: text("estado").notNull().default("pendiente"),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
    revisadaEn: timestamp("revisada_en"),
    revisadaPor: uuid("revisada_por").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("teacher_requests_una_pendiente_idx").on(table.userId).where(sql`estado = 'pendiente'`),
    index("teacher_requests_estado_idx").on(table.estado, table.creadaEn),
  ]
);

export const clases = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profesorId: uuid("profesor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rutaId: uuid("ruta_id")
      .notNull()
      .references(() => rutas.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    codigo: text("codigo").notNull(),
    estado: text("estado").notNull().default("activa"),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("classes_codigo_idx").on(table.codigo), index("classes_profesor_idx").on(table.profesorId)]
);

export const claseCasos = pgTable(
  "clase_casos",
  {
    claseId: uuid("clase_id")
      .notNull()
      .references(() => clases.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    habilitado: boolean("habilitado").notNull().default(true),
  },
  (table) => [primaryKey({ columns: [table.claseId, table.casoId] })]
);

export const claseInscripciones = pgTable(
  "class_enrollments",
  {
    claseId: uuid("clase_id")
      .notNull()
      .references(() => clases.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    estado: text("estado").notNull().default("pendiente"),
    solicitadaEn: timestamp("solicitada_en").notNull().defaultNow(),
    decididaEn: timestamp("decidida_en"),
  },
  (table) => [primaryKey({ columns: [table.claseId, table.userId] }), index("class_enrollments_usuario_idx").on(table.userId)]
);

export const preguntasProfesor = pgTable(
  "teacher_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alumnoId: uuid("alumno_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    mision: text("mision").notNull(),
    claseId: uuid("clase_id").references(() => clases.id, { onDelete: "set null" }),
    profesorId: uuid("profesor_id").references(() => users.id, { onDelete: "set null" }),
    texto: text("texto").notNull(),
    respuesta: text("respuesta"),
    estado: text("estado").notNull().default("pendiente"),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
    respondidaEn: timestamp("respondida_en"),
    respondidaPor: uuid("respondida_por").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("teacher_questions_alumno_idx").on(table.alumnoId, table.creadaEn),
    index("teacher_questions_profesor_idx").on(table.profesorId, table.estado),
  ]
);

export const resenasCaso = pgTable(
  "resenas_caso",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    estrellas: integer("estrellas").notNull(),
    comentario: text("comentario"),
    estadoComentario: text("estado_comentario"),
    moderadaPor: uuid("moderada_por").references(() => users.id, { onDelete: "set null" }),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("resenas_caso_usuario_idx").on(table.userId, table.casoId), index("resenas_caso_caso_idx").on(table.casoId)]
);

export const reportes = pgTable(
  "feedback_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    descripcion: text("descripcion").notNull(),
    pagina: text("pagina").notNull(),
    caso: text("caso"),
    mision: text("mision"),
    estado: text("estado").notNull().default("pendiente"),
    resueltoPor: uuid("resuelto_por").references(() => users.id, { onDelete: "set null" }),
    resueltoEn: timestamp("resuelto_en"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [index("feedback_reports_estado_idx").on(table.estado, table.creadoEn)]
);

export const mensajes = pgTable(
  "user_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    remitenteId: uuid("remitente_id").references(() => users.id, { onDelete: "set null" }),
    reporteId: uuid("reporte_id").references(() => reportes.id, { onDelete: "set null" }),
    asunto: text("asunto").notNull(),
    cuerpo: text("cuerpo").notNull(),
    leidoEn: timestamp("leido_en"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [index("user_messages_usuario_idx").on(table.userId, table.creadoEn)]
);
