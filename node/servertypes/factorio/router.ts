import { z } from "zod";
import { readFile, listFileNames, writeFile } from "../../src/serverTypes.js";
import { router, serverProcedure } from "../../src/trpc/trpc.js";
import axios from "axios";
import { TRPCError } from "@trpc/server";

const CategorySchema = z.enum([
  "",
  "no-category",
  "content",
  "overhaul",
  "tweaks",
  "utilities",
  "scenarios",
  "mod-packs",
  "localizations",
  "internal",
]);

const ReleaseSchema = z.object({
  download_url: z.string(),
  file_name: z.string(),
  info_json: z.object({}),
  released_at: z.string(),
  version: z.string(),
  sha1: z.string(),
});

const ResultSchema = z.object({
  lastest_release: ReleaseSchema.optional(),
  releases: ReleaseSchema.array().optional(),
  downloads_count: z.number(),
  name: z.string(),
  owner: z.string(),
  summary: z.string(),
  title: z.string(),
  category: CategorySchema,
  score: z.number().optional(),
});

const ShortResultSchema = ResultSchema.omit({ lastest_release: true }).extend({
  thumbnail: z.string().optional(),
});

type ShortResult = z.infer<typeof ShortResultSchema>;

const ModListResponseSchema = z.object({
  pagination: z.object({
    count: z.number(),
    links: z.object({
      first: z.string().nullable(),
      prev: z.string().nullable(),
      next: z.string().nullable(),
      last: z.string().nullable(),
    }),
    page: z.number(),
    page_count: z.number(),
    page_size: z.number(),
  }),
  results: ResultSchema.array(),
});

const LoginResponseSchema = z.union([
  z.object({ token: z.string() }),
  z.object({ error: z.string(), message: z.string() }),
]);

const ModListSchema = z.object({
  mods: z.array(
    z.object({
      name: z.string(),
      enabled: z.boolean(),
    })
  ),
});

async function getLocalMods(serverId: string) {
  const modListData = readFile(serverId, "/mods/mod-list.json");
  const modList = ModListSchema.parse(JSON.parse(modListData));

  const mods = [
    {
      info: {
        name: "base",
        category: "internal",
        downloads_count: 0,
        owner: "Wube",
        summary: "Factorio Base Mod",
        title: "Base",
        releases: [],
      } as ShortResult,
      installedVersion: undefined as string | undefined,
      enabled:
        modList.mods.find((mod) => mod.name === "base")?.enabled || false,
    },
    {
      info: {
        name: "elevated-rails",
        category: "internal",
        downloads_count: 0,
        owner: "Wube",
        summary: "Elevated Rails",
        title: "Elevated Rails",
        releases: [],
      } as ShortResult,
      installedVersion: undefined as string | undefined,
      enabled:
        modList.mods.find((mod) => mod.name === "elevated-rails")?.enabled ||
        false,
    },
    {
      info: {
        name: "quality",
        category: "internal",
        downloads_count: 0,
        owner: "Wube",
        summary: "Quality",
        title: "Quality",
        releases: [],
      } as ShortResult,
      installedVersion: undefined as string | undefined,
      enabled:
        modList.mods.find((mod) => mod.name === "quality")?.enabled || false,
    },
    {
      info: {
        name: "space-age",
        category: "internal",
        downloads_count: 0,
        owner: "Wube",
        summary: "Space Age",
        title: "Space Age",
        releases: [],
      } as ShortResult,
      installedVersion: undefined as string | undefined,
      enabled:
        modList.mods.find((mod) => mod.name === "space-age")?.enabled || false,
    },
  ];
  const fileNames = listFileNames(serverId, "/mods");
  for (const fileName of fileNames) {
    // If the filename matches the pattern "<modname>_<version>.zip", get mod data from the api
    const match = fileName.match(/\/mods\/(.+)_([0-9]+\.[0-9]+\.[0-9]+)\.zip$/);
    if (match) {
      const modName = match[1];
      const modVersion = match[2];
      const modInfoResponse = await axios.get(
        `https://mods.factorio.com/api/mods/${modName}`
      );
      const modInfo = ShortResultSchema.parse(modInfoResponse.data);
      mods.push({
        info: modInfo,
        installedVersion: modVersion,
        enabled:
          modList.mods.find((mod) => mod.name === modName)?.enabled || false,
      });
    }
  }
  return mods;
}

export const serverTypeRouter = router({
  getInstalledMods: serverProcedure
    .meta({
      //TODO permission
    })
    .query(async ({ ctx }) => {
      return await getLocalMods(ctx.server.id);
    }),
  updateModList: serverProcedure
    .meta({
      //TODO permission
    })
    .input(
      z.object({
        name: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const modListData = readFile(ctx.server.id, "/mods/mod-list.json");
      const modList = ModListSchema.parse(JSON.parse(modListData));
      const existingMod = modList.mods.find((mod) => mod.name === input.name);
      if (existingMod) {
        existingMod.enabled = input.enabled;
      } else {
        modList.mods.push({ name: input.name, enabled: input.enabled });
      }
      writeFile(
        ctx.server.id,
        "/mods/mod-list.json",
        Buffer.from(JSON.stringify(modList))
      );
    }),
  searchMods: serverProcedure
    .meta({
      //TODO permission
    })
    .input(
      z.object({
        page: z.number().min(1).default(1),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await axios.get("https://mods.factorio.com/api/mods", {
        params: {
          version: "2.0", // TODO support more versions
          page_size: 20,
          page: input.page.toString(),
          namelist: input.search,
        },
      });

      try {
        const data = ModListResponseSchema.parse(result.data);
        const mods = [];

        for (const mod of data.results) {
          const info = await axios.get(
            `https://mods.factorio.com/api/mods/${mod.name}`
          );
          const parsed = ShortResultSchema.parse(info.data);
          mods.push(parsed);
        }

        return {
          mods,
          pageCount: data.pagination.page_count,
        };
      } catch (e) {
        console.error("Failed to parse Factorio mod list response:", e);
        throw e;
      }
    }),
  installMod: serverProcedure
    .meta({
      //TODO permission
    })
    .input(
      z.object({
        name: z.string(),
        version: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const username = ctx.server.options.username;
      const token = ctx.server.options.token;
      if (!username || !token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Factorio username or token not set in server options",
        });
      }

      const info = await axios.get(
        `https://mods.factorio.com/api/mods/${input.name}`
      );
      const parsed = ShortResultSchema.parse(info.data);

      const release = parsed.releases?.find(
        (entry) => entry.version === input.version
      );

      if (!release) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Release not found",
        });
      }

      const modData = await axios.get(
        `https://mods.factorio.com/${release.download_url}`,
        {
          params: {
            username,
            token,
          },
          responseType: "arraybuffer",
        }
      );
      const contentType = modData.headers["content-type"] || "";

      if (contentType.includes("text/html")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Failed to download mod. Please check your Factorio credentials.",
        });
      }

      const path = `/mods/${release.file_name}`;
      writeFile(ctx.server.id, path, Buffer.from(modData.data));
    }),
});
