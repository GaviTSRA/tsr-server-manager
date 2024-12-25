CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"password" varchar NOT NULL,
	CONSTRAINT "User_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "Server" ADD COLUMN "ownerId" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Server" ADD CONSTRAINT "Server_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
