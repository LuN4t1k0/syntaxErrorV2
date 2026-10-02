ALTER TABLE "entregables" ADD COLUMN "puntajes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "entregables" ADD COLUMN "observaciones" jsonb DEFAULT '{}'::jsonb NOT NULL;