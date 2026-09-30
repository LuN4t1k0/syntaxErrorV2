CREATE TABLE IF NOT EXISTS "certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"caso_id" uuid,
	"ruta_id" uuid,
	"codigo" text NOT NULL,
	"nombre_alumno" text NOT NULL,
	"titulo" text NOT NULL,
	"cargo" text,
	"emitido_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificados_legacy" (
	"codigo" text PRIMARY KEY NOT NULL,
	"nombre_alumno" text NOT NULL,
	"titulo" text NOT NULL,
	"tipo" text NOT NULL,
	"emitido_en" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tokens_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expira_en" timestamp NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "usuario" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "portafolio_publico" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificados" ADD CONSTRAINT "certificados_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificados" ADD CONSTRAINT "certificados_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificados" ADD CONSTRAINT "certificados_ruta_id_rutas_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."rutas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tokens_email" ADD CONSTRAINT "tokens_email_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificados_codigo_idx" ON "certificados" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificados_usuario_caso_idx" ON "certificados" USING btree ("user_id","tipo","caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificados_usuario_ruta_idx" ON "certificados" USING btree ("user_id","tipo","ruta_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tokens_email_hash_idx" ON "tokens_email" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_usuario_idx" ON "users" USING btree ("usuario");