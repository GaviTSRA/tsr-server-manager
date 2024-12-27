import fs from "fs";
import cors from "cors";
import * as docker from "./docker";
import "dotenv/config";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/trpc";
export type { AppRouter } from "./trpc/router";

export type ServerType = {
  id: string;
  command: string;
  name: string;
  image: string | null;
  options: {
    [id: string]: {
      name: string;
      description: string;
      type: "string" | "enum";
      default: string;
      options: string[] | undefined;
    };
  };
};

export const serverTypes: ServerType[] = [];
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

export type Permission =
  | "server" // TODO frontend
  | "power" // TODO frontend
  | "console.read" // TODO
  | "console.write" // TODO
  | "files.read" // TODO frontend
  | "files.rename" // TODO frontend
  | "files.edit"// TODO frontend
  | "files.delete"// TODO frontend
  | "network.read"// TODO frontend
  | "network.write"// TODO frontend
  | "startup.read"
  | "startup.write"
  | "limits.read"
  | "limits.write";

const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
  createContext,
});
server.listen(3000);
