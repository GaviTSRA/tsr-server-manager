ALTER TABLE "Permission" RENAME TO "AssignedPermission";--> statement-breakpoint
ALTER TABLE "AssignedPermission" DROP CONSTRAINT "Permission_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "AssignedPermission" DROP CONSTRAINT "Permission_serverId_Server_id_fk";
--> statement-breakpoint
ALTER TABLE "AssignedPermission" DROP CONSTRAINT "Permission_userId_serverId_permission_pk";--> statement-breakpoint
ALTER TABLE "AssignedPermission" ADD CONSTRAINT "AssignedPermission_userId_serverId_permission_pk" PRIMARY KEY("userId","serverId","permission");--> statement-breakpoint
ALTER TABLE "AssignedPermission" ADD CONSTRAINT "AssignedPermission_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AssignedPermission" ADD CONSTRAINT "AssignedPermission_serverId_Server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."Server"("id") ON DELETE no action ON UPDATE no action;