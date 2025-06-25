CREATE TYPE "public"."RestartPolicy" AS ENUM('no', 'on-failure', 'unless-stopped', 'always');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Log" (
	"userId" uuid NOT NULL,
	"serverId" uuid NOT NULL,
	"log" text NOT NULL,
	"date" timestamp NOT NULL,
	"success" boolean NOT NULL,
	CONSTRAINT "Log_userId_serverId_log_date_pk" PRIMARY KEY("userId","serverId","log","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Permission" (
	"userId" uuid NOT NULL,
	"serverId" uuid NOT NULL,
	"permission" varchar NOT NULL,
	CONSTRAINT "Permission_userId_serverId_permission_pk" PRIMARY KEY("userId","serverId","permission")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Server" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ownerId" uuid NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"containerId" varchar,
	"options" json NOT NULL,
	"ports" json NOT NULL,
	"cpuLimit" real NOT NULL,
	"ramLimit" integer NOT NULL,
	"restartPolicy" "RestartPolicy" DEFAULT 'no' NOT NULL,
	"restartRetryCount" integer DEFAULT 1 NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	CONSTRAINT "User_name_unique" UNIQUE("name")
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Server" ADD CONSTRAINT "Server_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
