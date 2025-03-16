CREATE TABLE IF NOT EXISTS "Node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" varchar NOT NULL,
	"name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"password" varchar NOT NULL,
	"canCreateServers" boolean DEFAULT false NOT NULL,
	CONSTRAINT "User_name_unique" UNIQUE("name")
);
