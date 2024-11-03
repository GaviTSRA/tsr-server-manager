ALTER TABLE "Server" ALTER COLUMN "state" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Server" ALTER COLUMN "containerId" DROP NOT NULL;