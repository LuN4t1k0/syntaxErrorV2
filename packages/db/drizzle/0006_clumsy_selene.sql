ALTER TABLE "entregables" ADD COLUMN "estado" text DEFAULT 'pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE "entregables" ADD COLUMN "verificado_en" timestamp;--> statement-breakpoint
ALTER TABLE "entregables" ADD COLUMN "comentario" text;--> statement-breakpoint
ALTER TABLE "entregables" ADD COLUMN "criterios" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "entregables" ADD COLUMN "revisado_por" uuid;--> statement-breakpoint
ALTER TABLE "entregables" ADD COLUMN "revisado_en" timestamp;--> statement-breakpoint
ALTER TABLE "mision_progreso" ADD COLUMN "fallidos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entregables" ADD CONSTRAINT "entregables_revisado_por_users_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
