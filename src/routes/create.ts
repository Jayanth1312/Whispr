import { Hono } from "hono";
import { page, render, errorPage, esc } from "../lib/template";
import { db } from "../lib/db";
import { generateId, expiryFromHours } from "../lib/utils";

export const createRoute = new Hono();

async function questionBlock(idx: number): Promise<string> {
  const isFirst = idx === 0;
  const removeBtn = isFirst
    ? ""
    : `<button type="button" style="font-size:0.75rem; font-weight: 500; padding:0.35rem 0.75rem; background:#dc2626; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:opacity 0.1s;" 
         onmouseover="this.style.opacity=0.9" onmouseout="this.style.opacity=1"
         onclick="this.closest('.q-block').remove(); reindexQuestions();">Remove</button>`;
  return render("partials/question-block", {
    IDX: String(idx),
    NUM: String(idx + 1),
    REMOVE_BTN: removeBtn,
  });
}

const getCreateHandler = async (c: any) => {
  const initial = (await Promise.all([0, 1].map(questionBlock))).join("");
  return c.html(await page("Create session", "create", { INITIAL_QUESTIONS: initial }));
};

createRoute.get("/create", getCreateHandler);
createRoute.get("/create/", getCreateHandler);

// HTMX: append a new question block
createRoute.get("/create/add-question", async (c) => {
  const idx = parseInt(c.req.query("idx") ?? "2");
  if (idx >= 6) return c.text("");
  return c.html(await questionBlock(idx));
});

const postCreateHandler = async (c: any) => {
  try {
    const body = await c.req.parseBody();
    const topic = String(body["topic"] ?? "").trim();
    const expiry = parseInt(String(body["expiry"] ?? "24"));

    if (!topic) {
      return c.html(`<div id="form-area"><p style="color:var(--danger)">Topic is required.</p><a href="/create" role="button">Go back</a></div>`);
    }

    // Collect questions
    const questions: { text: string; type: string; options: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const text = String(body[`q_text_${i}`] ?? "").trim();
      if (!text) continue;
      const type = String(body[`q_type_${i}`] ?? "text");
      const rawOpts = String(body[`q_opts_${i}`] ?? "");
      const options = rawOpts
        ? JSON.stringify(rawOpts.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 6))
        : "[]";
      questions.push({ text, type, options });
    }

    if (questions.length === 0) {
      return c.html(`<div id="form-area"><p style="color:var(--danger)">Add at least one question.</p><a href="/create" role="button">Go back</a></div>`);
    }

    const sessionId = generateId(10);
    const creatorToken = generateId(20);
    const expiresAt = expiryFromHours(expiry);

    await db.execute({
      sql: `INSERT INTO sessions (id, topic, creator_token, expires_at) VALUES (?, ?, ?, ?)`,
      args: [sessionId, topic, creatorToken, expiresAt],
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.execute({
        sql: `INSERT INTO questions (session_id, text, type, options, position) VALUES (?, ?, ?, ?, ?)`,
        args: [sessionId, q.text, q.type, q.options, i],
      });
    }

    const base = process.env.BASE_URL ?? "http://localhost:3000";
    const shareUrl = `${base}/respond/${sessionId}`;
    const resultsUrl = `${base}/results/${sessionId}?token=${creatorToken}`;

    return c.html(await render("created", { 
      SHARE_URL: shareUrl, 
      RESULTS_URL: resultsUrl, 
      TOPIC: esc(topic).replace(/'/g, "\\'") 
    }));

  } catch (err: any) {
    console.error("Crash creating session:", err);
    return c.html(`<div id="form-area"><p style="color:var(--danger)">Server Error: ${err.message || err}</p><a href="/create" role="button">Go back</a></div>`, 500);
  }
};

createRoute.post("/create", postCreateHandler);
createRoute.post("/create/", postCreateHandler);
