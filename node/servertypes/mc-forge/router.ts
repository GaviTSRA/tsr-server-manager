import { z } from "zod";
import { readFile } from "../../src/serverTypes.js";
import { router, serverProcedure } from "../../src/trpc/trpc.js";

const opsSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    level: z.number().int().min(1).max(4),
    bypassesPlayerLimit: z.boolean().optional(),
  })
  .array();

export const serverTypeRouter = router({
  getPlayers: serverProcedure
    .meta({
      permission: "mc-forge.players.read",
    })
    .query(async ({ ctx }) => {
      if (!ctx.server.metadata.players) {
        return [];
      }
      return ctx.server.metadata.players;
    }),
  getOps: serverProcedure
    .meta({
      permission: "mc-forge.players.readOps",
    })
    .query(async ({ ctx }) => {
      const data = readFile(ctx.server.id, "ops.json");
      const parsed = JSON.parse(data);
      const validated = opsSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error("Invalid ops.json: " + validated.error.message);
      }
      return validated.data.map((op) => op.name);
    }),
});
