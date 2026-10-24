CREATE TABLE IF NOT EXISTS "practice_time" (
	"user_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"minutos" integer DEFAULT 0 NOT NULL,
	"ultimo_latido" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "practice_time_user_id_dia_pk" PRIMARY KEY("user_id","dia")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_time" ADD CONSTRAINT "practice_time_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
