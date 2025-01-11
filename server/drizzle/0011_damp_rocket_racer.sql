CREATE TABLE IF NOT EXISTS "Log" (
	"userId" uuid NOT NULL,
	"serverId" uuid NOT NULL,
	"log" text NOT NULL,
	"inputs" json NOT NULL,
	"date" timestamp NOT NULL,
	CONSTRAINT "Log_userId_serverId_log_date_pk" PRIMARY KEY("userId","serverId","log","date")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Log" ADD CONSTRAINT "Log_serverId_Server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."Server"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
