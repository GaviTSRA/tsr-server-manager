import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let https = undefined;

  if (env.HTTPS === "true") {
    https = {
      key: readFileSync("private-key.pem"),
      cert: readFileSync("certificate.pem"),
    };
    console.info("HTTPS Enabled");
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      strictPort: true,
      port: parseInt(env.PORT ?? "3001"),
      https: https,
    },
  };
});
