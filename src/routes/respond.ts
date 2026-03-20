import { Hono } from "hono";
import { page, render, errorPage, esc } from "../lib/template";
import { db } from "../lib/db";
import { isExpired, timeLeft } from "../lib/utils";
import { responseField, type Question, type QuestionType } from "../lib/questions";

export const respondRoute = new Hono();

respondRoute.get("/respond/:id", async (c) => {
  const id = c.req.param("id");
  const session = await getSession(id);

  if (!session) return c.html(await errorPage("🔍", "Session not found", "This link may be invalid or already deleted."), 404);
  if (isExpired(Number(session.expires_at))) {
    return c.html(await errorPage("⌛", "Session expired", "Responses are no longer accepted and all data has been deleted."));
  }

  const qs = await getQuestions(id);
  const fields = qs.map(q => responseField(q)).join("");

  return c.html(await page(
    `Respond — ${session.topic}`,
    "respond",
    {
      TOPIC: esc(String(session.topic)),
      TIME_LEFT: timeLeft(Number(session.expires_at)),
      SESSION_ID: id,
      QUESTION_FIELDS: fields,
    }
  ));
});

respondRoute.post("/respond/:id", async (c) => {
  const id = c.req.param("id");
  const session = await getSession(id);

  if (!session || isExpired(Number(session.expires_at))) {
    return c.html(`<div id="respond-area" style="text-align:center;padding:2rem;"><p style="color:var(--danger)">This session is no longer accepting responses.</p></div>`);
  }

  const body = await c.req.parseBody();
  const qs = await getQuestions(id);

  for (const q of qs) {
    let answer = "";

    if (q.type === "rank") {
      // Collect rank hidden inputs: ans_{id}_0, ans_{id}_1 ...
      const parts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const v = String(body[`ans_${q.id}_${i}`] ?? "").trim();
        if (v) parts.push(v);
      }
      answer = parts.join("|");
    } else {
      answer = String(body[`ans_${q.id}`] ?? "").trim();
    }

    if (answer) {
      await db.execute({
        sql: `INSERT INTO responses (session_id, question_id, answer) VALUES (?, ?, ?)`,
        args: [id, q.id, answer],
      });
    }
  }

  return c.html(await render("respond-done"));
});

async function getSession(id: string) {
  const res = await db.execute({ sql: `SELECT * FROM sessions WHERE id = ?`, args: [id] });
  return res.rows[0] ?? null;
}

async function getQuestions(sessionId: string): Promise<Question[]> {
  const res = await db.execute({
    sql: `SELECT * FROM questions WHERE session_id = ? ORDER BY position`,
    args: [sessionId],
  });
  return res.rows.map(r => ({
    id: Number(r.id),
    session_id: String(r.session_id),
    text: String(r.text),
    type: String(r.type) as QuestionType,
    options: String(r.options ?? "[]"),
    position: Number(r.position),
  }));
}
