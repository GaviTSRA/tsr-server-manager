ALTER TABLE "Server" DROP COLUMN "ports";
ALTER TABLE "Server" ADD COLUMN "ports" integer[];