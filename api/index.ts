import { Hono } from "hono";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { initDb } from "../src/lib/db";
import { startCleanupJob } from "../src/lib/cleanup";
import { homeRoute } from "../src/routes/home";
import { createRoute } from "../src/routes/create";
import { respondRoute } from "../src/routes/respond";
import { resultsRoute } from "../src/routes/results";

const app = new Hono();

// Serve static font files from src/fonts/
app.get("/fonts/:filename", async (c) => {
  const filename = c.req.param("filename");
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

if (!process.env.TURSO_DATABASE_URL) {
  console.error("❌ Missing TURSO_DATABASE_URL environment variable!");
} else {
  initDb()
    .then(() => console.log("🟢 Database initialized"))
    .catch((e) => console.error("❌ Database init failed:", e));
}

startCleanupJob();

export default {
  port: process.env.PORT ?? 3000,
  fetch: app.fetch,
};
