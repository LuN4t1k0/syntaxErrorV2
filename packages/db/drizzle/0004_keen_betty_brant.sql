CREATE TABLE IF NOT EXISTS "ai_chat_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"mision" text NOT NULL,
	"pregunta" text NOT NULL,
	"respuesta" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_chat_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"mision" text NOT NULL,
	"pregunta" text NOT NULL,
	"respuesta" text,
	"estado" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"respondida_en" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_chat_cache" ADD CONSTRAINT "ai_chat_cache_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_chat_questions" ADD CONSTRAINT "ai_chat_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_chat_questions" ADD CONSTRAINT "ai_chat_questions_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_chat_cache_mision_idx" ON "ai_chat_cache" USING btree ("caso_id","mision");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_chat_cache_embedding_idx" ON "ai_chat_cache" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_chat_questions_usuario_idx" ON "ai_chat_questions" USING btree ("user_id","creado_en");