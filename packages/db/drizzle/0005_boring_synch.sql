CREATE TABLE IF NOT EXISTS "clase_casos" (
	"clase_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"habilitado" boolean DEFAULT true NOT NULL,
	CONSTRAINT "clase_casos_clase_id_caso_id_pk" PRIMARY KEY("clase_id","caso_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "class_enrollments" (
	"clase_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"solicitada_en" timestamp DEFAULT now() NOT NULL,
	"decidida_en" timestamp,
	CONSTRAINT "class_enrollments_clase_id_user_id_pk" PRIMARY KEY("clase_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profesor_id" uuid NOT NULL,
	"ruta_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"codigo" text NOT NULL,
	"estado" text DEFAULT 'activa' NOT NULL,
	"creada_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"remitente_id" uuid,
	"reporte_id" uuid,
	"asunto" text NOT NULL,
	"cuerpo" text NOT NULL,
	"leido_en" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"mision" text NOT NULL,
	"clase_id" uuid,
	"profesor_id" uuid,
	"texto" text NOT NULL,
	"respuesta" text,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"creada_en" timestamp DEFAULT now() NOT NULL,
	"respondida_en" timestamp,
	"respondida_por" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"descripcion" text NOT NULL,
	"pagina" text NOT NULL,
	"caso" text,
	"mision" text,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"resuelto_por" uuid,
	"resuelto_en" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resenas_caso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"estrellas" integer NOT NULL,
	"comentario" text,
	"estado_comentario" text,
	"moderada_por" uuid,
	"creada_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"creada_en" timestamp DEFAULT now() NOT NULL,
	"revisada_en" timestamp,
	"revisada_por" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"motivo" text NOT NULL,
	"cantidad" integer NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clase_casos" ADD CONSTRAINT "clase_casos_clase_id_classes_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clase_casos" ADD CONSTRAINT "clase_casos_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_clase_id_classes_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classes" ADD CONSTRAINT "classes_profesor_id_users_id_fk" FOREIGN KEY ("profesor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classes" ADD CONSTRAINT "classes_ruta_id_rutas_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."rutas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_remitente_id_users_id_fk" FOREIGN KEY ("remitente_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_reporte_id_feedback_reports_id_fk" FOREIGN KEY ("reporte_id") REFERENCES "public"."feedback_reports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_questions" ADD CONSTRAINT "teacher_questions_alumno_id_users_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_questions" ADD CONSTRAINT "teacher_questions_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_questions" ADD CONSTRAINT "teacher_questions_clase_id_classes_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_questions" ADD CONSTRAINT "teacher_questions_profesor_id_users_id_fk" FOREIGN KEY ("profesor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_questions" ADD CONSTRAINT "teacher_questions_respondida_por_users_id_fk" FOREIGN KEY ("respondida_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_resuelto_por_users_id_fk" FOREIGN KEY ("resuelto_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resenas_caso" ADD CONSTRAINT "resenas_caso_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resenas_caso" ADD CONSTRAINT "resenas_caso_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resenas_caso" ADD CONSTRAINT "resenas_caso_moderada_por_users_id_fk" FOREIGN KEY ("moderada_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_requests" ADD CONSTRAINT "teacher_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_requests" ADD CONSTRAINT "teacher_requests_revisada_por_users_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_enrollments_usuario_idx" ON "class_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classes_codigo_idx" ON "classes" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classes_profesor_idx" ON "classes" USING btree ("profesor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_messages_usuario_idx" ON "user_messages" USING btree ("user_id","creado_en");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_questions_alumno_idx" ON "teacher_questions" USING btree ("alumno_id","creada_en");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_questions_profesor_idx" ON "teacher_questions" USING btree ("profesor_id","estado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_reports_estado_idx" ON "feedback_reports" USING btree ("estado","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resenas_caso_usuario_idx" ON "resenas_caso" USING btree ("user_id","caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resenas_caso_caso_idx" ON "resenas_caso" USING btree ("caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teacher_requests_una_pendiente_idx" ON "teacher_requests" USING btree ("user_id") WHERE estado = 'pendiente';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_requests_estado_idx" ON "teacher_requests" USING btree ("estado","creada_en");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "point_transactions_logro_idx" ON "point_transactions" USING btree ("user_id","caso_id","clave");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "point_transactions_usuario_idx" ON "point_transactions" USING btree ("user_id");