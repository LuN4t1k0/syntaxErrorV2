ALTER TABLE "rutas" ADD COLUMN "teaser" text;--> statement-breakpoint
ALTER TABLE "rutas" ADD COLUMN "estado_admin" text;--> statement-breakpoint
ALTER TABLE "rutas" ADD COLUMN "estado_cambiado_por" uuid;--> statement-breakpoint
ALTER TABLE "rutas" ADD COLUMN "estado_cambiado_en" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bienvenida_vista_en" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ruta_elegida" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rutas" ADD CONSTRAINT "rutas_estado_cambiado_por_users_id_fk" FOREIGN KEY ("estado_cambiado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_ruta_elegida_rutas_id_fk" FOREIGN KEY ("ruta_elegida") REFERENCES "public"."rutas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
