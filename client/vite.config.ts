import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

let https = {};
if (process.env.HTTPS === "true") {
  https = {
    key: readFileSync("private-key.pem"),
    cert: readFileSync("certificate.pem"),
  };
  console.info("HTTPS Enabled");
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
    port: parseInt(process.env.PORT ?? "3001"),
    https,
  },
});
