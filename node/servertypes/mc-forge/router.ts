import { z } from "zod";
import { readFile, listFileNames } from "../../src/serverTypes.js";
import { router, serverProcedure } from "../../src/trpc/trpc.js";
import AdmZip from 'adm-zip';
import * as TOML from '@iarna/toml';

const opsSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    level: z.number().int().min(1).max(4),
    bypassesPlayerLimit: z.boolean().optional(),
  })
  .array();

const modSchema = z
  .object({
    logoFile: z.string().optional(),
    mods: z.object({
      modId: z.string(),
      displayName: z.string(),
      version: z.string(),
      logoFile: z.string().optional(),
    }).array(),
  });

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
  getMods: serverProcedure
    .meta({
      //TODO permission
    }).query(async ({ ctx }) => {
      const result: ({
        success: true,
        fileName: string;
        id: string;
        name: string;
        version: string;
        logo: string | undefined;
      } | {
        success: false,
        fileName: string;
        error: string;
      })[] = [];

      const files = listFileNames(ctx.server.id, 'mods', /[\w-. ]*.jar/)

      for (const file of files) {
        try {
          const zip = new AdmZip(file);
          const entry = zip.getEntry('META-INF/mods.toml');

          if (!entry) {
            result.push({ success: false, fileName: file, error: 'mods.toml not found in the jar.' });
            continue;
          }

          const tomlText = zip.readAsText(entry);
          const parsed = TOML.parse(tomlText);
          const data = modSchema.parse(parsed);
          for (const mod of data.mods) {
            let logo = undefined;
            if (mod.logoFile || data.logoFile) {
              const logoFile = zip.getEntry(mod.logoFile ?? data.logoFile!);
              if (logoFile) {
                const logoBuffer = zip.readFile(logoFile);
                if (logoBuffer) {
                  const base64 = logoBuffer.toString('base64');
                  logo = `data:image/png;base64,${base64}`;
                }
              }
            }

            let version = mod.version;
            if (version === "${file.jarVersion}") {
              const manifest = zip.getEntry('META-INF/MANIFEST.MF')!;
              const text = zip.readAsText(manifest);
              version = text.split("\n").find(entry => entry.startsWith("Implementation-Version: "))!.split("Implementation-Version: ")[1];
            }

            result.push({ success: true, fileName: file, id: mod.modId, name: mod.displayName, version, logo });
          }

        } catch (error) {
          result.push({ success: false, fileName: file, error: 'Failed to read mod:' + error });
        }
      }

      return result;
    })
});
