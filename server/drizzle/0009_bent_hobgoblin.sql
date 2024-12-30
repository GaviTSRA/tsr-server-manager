CREATE TYPE "public"."RestartPolicy" AS ENUM('no', 'on-failure', 'unless-stopped', 'always');--> statement-breakpoint
ALTER TABLE "Server" ADD COLUMN "restartPolicy" "RestartPolicy" DEFAULT 'no' NOT NULL;--> statement-breakpoint
ALTER TABLE "Server" ADD COLUMN "restartRetryCount" integer DEFAULT 1 NOT NULL;