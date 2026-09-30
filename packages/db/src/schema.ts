import {
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
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
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
    estado: text("estado").notNull().default("borrador"),
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
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("entregables_usuario_caso_idx").on(table.userId, table.casoId)]
);
