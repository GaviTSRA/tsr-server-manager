CREATE TABLE IF NOT EXISTS "Permission" (
	"userId" uuid NOT NULL,
	"serverId" uuid NOT NULL,
	"permission" varchar NOT NULL,
	CONSTRAINT "Permission_userId_serverId_permission_pk" PRIMARY KEY("userId","serverId","permission")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Permission" ADD CONSTRAINT "Permission_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Permission" ADD CONSTRAINT "Permission_serverId_Server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."Server"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
