import { Hono } from "hono";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { initDb } from "./lib/db";
import { startCleanupJob } from "./lib/cleanup";
import { homeRoute } from "./routes/home";
import { createRoute } from "./routes/create";
import { respondRoute } from "./routes/respond";
import { resultsRoute } from "./routes/results";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

// Serve static font files from src/fonts/
app.get("/fonts/:filename", async (c) => {
  const filename = c.req.param("filename");
  // Basic security: only allow font filenames, no path traversal
  if (!/^[\w.-]+\.(woff2?|ttf|otf|eot)$/i.test(filename)) {
    return c.text("Not found", 404);
  }
  const fontPath = join(process.cwd(), "src", "fonts", filename);
  if (!existsSync(fontPath)) return c.text("Not found", 404);
  const ext = filename.split(".").pop()?.toLowerCase();
  const mime =
    ext === "woff2" ? "font/woff2" :
    ext === "woff"  ? "font/woff"  :
    ext === "ttf"   ? "font/ttf"   :
    "application/octet-stream";
  const data = readFileSync(fontPath);
  return new Response(data, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

app.route("/", homeRoute);
app.route("/", createRoute);
app.route("/", respondRoute);
app.route("/", resultsRoute);

app.notFound((c) =>
  c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem">
    <h2>404 — Not found</h2><a href="/">Go home</a>
  </body></html>`, 404)
);

await initDb();
startCleanupJob();

console.log("🟢 Whispr running → http://localhost:3000");

export default {
  port: process.env.PORT ?? 3000,
  fetch: app.fetch,
};
