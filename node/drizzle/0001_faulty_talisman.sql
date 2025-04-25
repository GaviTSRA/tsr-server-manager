CREATE TABLE IF NOT EXISTS "ServerStat" (
	"serverId" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"cpuUsage" real NOT NULL,
	"cpuCount" integer NOT NULL,
	"ramUsage" real NOT NULL,
	"ramAvailable" real NOT NULL,
	"diskUsage" real NOT NULL,
	"networkIn" real NOT NULL,
	"networkOut" real NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ServerStat" ADD CONSTRAINT "ServerStat_serverId_Server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."Server"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
