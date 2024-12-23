import fs from "fs";
import cors from "cors";
import * as docker from "./docker";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/trpc";
export type { AppRouter } from "./trpc/router";

const db = drizzle(process.env.DATABASE_URL!, { schema });

type ServerType = {
  id: string;
  command: string;
  name: string;
  image: string | null;
  options: {
    [name: string]: {
      type: "string" | "enum";
      default: string;
      options: string[] | undefined;
    };
  };
};

const serverTypes: ServerType[] = [];
fs.readdirSync("servertypes").forEach((folder) => {
  const json = fs
    .readFileSync(`servertypes/${folder}/manifest.json`)
    .toString();
  const data = JSON.parse(json);
  serverTypes.push({
    id: folder,
    name: data.name,
    image: data.image,
    command: data.command,
    options: data.options,
  });
});

const customImages = [] as string[];
fs.readdirSync("images").forEach((folder) => {
  console.info("Building image " + folder);
  const data = fs.readFileSync(`images/${folder}/Dockerfile`).toString();
  customImages.push(folder);
  docker.buildImage(folder, data);
});

const requiredImages = [] as string[];
serverTypes.forEach((type) => {
  if (
    type.image &&
    !requiredImages.includes(type.image) &&
    !customImages.includes(type.image)
  )
    requiredImages.push(type.image);
  if (type.options["image"]) {
    type.options["image"].options?.forEach((image) => {
      if (!requiredImages.includes(image) && !customImages.includes(image))
        requiredImages.push(image);
    });
  }
});
docker.getImages().then(({ data: downloadedImages, status }) => {
  if (!downloadedImages) {
    console.error("Failed to download images", status);
    return;
  }
  requiredImages.forEach((image) => {
    if (!downloadedImages.includes(image)) {
      console.info("Downloading image " + image);
      docker.downloadImage(image);
    }
  });
});

const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
  createContext,
});
server.listen(3000);
