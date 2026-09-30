CREATE TABLE IF NOT EXISTS "caso_inscripciones" (
	"user_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"inscrito_en" timestamp DEFAULT now() NOT NULL,
	"completado_en" timestamp,
	CONSTRAINT "caso_inscripciones_user_id_caso_id_pk" PRIMARY KEY("user_id","caso_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "casos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"cargo" text NOT NULL,
	"empresa" text NOT NULL,
	"entregable" text NOT NULL,
	"misiones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entregables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"url" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mision_progreso" (
	"user_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"mision" text NOT NULL,
	"estado" text DEFAULT 'en_curso' NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"tareas_aprobadas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aprobada_en" timestamp,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mision_progreso_user_id_caso_id_mision_pk" PRIMARY KEY("user_id","caso_id","mision")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ruta_casos" (
	"ruta_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "ruta_casos_ruta_id_caso_id_pk" PRIMARY KEY("ruta_id","caso_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ruta_inscripciones" (
	"user_id" uuid NOT NULL,
	"ruta_id" uuid NOT NULL,
	"inscrito_en" timestamp DEFAULT now() NOT NULL,
	"completado_en" timestamp,
	CONSTRAINT "ruta_inscripciones_user_id_ruta_id_pk" PRIMARY KEY("user_id","ruta_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rutas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"cargo" text NOT NULL,
	"descripcion" text NOT NULL,
	"estado" text DEFAULT 'borrador' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caso_inscripciones" ADD CONSTRAINT "caso_inscripciones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "caso_inscripciones" ADD CONSTRAINT "caso_inscripciones_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entregables" ADD CONSTRAINT "entregables_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entregables" ADD CONSTRAINT "entregables_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mision_progreso" ADD CONSTRAINT "mision_progreso_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mision_progreso" ADD CONSTRAINT "mision_progreso_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruta_casos" ADD CONSTRAINT "ruta_casos_ruta_id_rutas_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."rutas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruta_casos" ADD CONSTRAINT "ruta_casos_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruta_inscripciones" ADD CONSTRAINT "ruta_inscripciones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ruta_inscripciones" ADD CONSTRAINT "ruta_inscripciones_ruta_id_rutas_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."rutas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "casos_slug_idx" ON "casos" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entregables_usuario_caso_idx" ON "entregables" USING btree ("user_id","caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rutas_slug_idx" ON "rutas" USING btree ("slug");