CREATE TABLE IF NOT EXISTS "Server" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"containerId" varchar NOT NULL
);
