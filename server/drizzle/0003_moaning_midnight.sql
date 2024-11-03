CREATE TYPE "public"."ServerState" AS ENUM('INSTALLED', 'NOT_INSTALLED');--> statement-breakpoint
ALTER TABLE "Server" ADD COLUMN "state" "ServerState";