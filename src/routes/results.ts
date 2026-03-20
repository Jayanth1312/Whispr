import { Hono } from "hono";
import { page, render, errorPage, esc } from "../lib/template";
import { db } from "../lib/db";
import { isExpired, timeLeft, formatCount } from "../lib/utils";
import { resultsBlock, type Question, type QuestionType } from "../lib/questions";

export const resultsRoute = new Hono();

resultsRoute.get("/results/:id", async (c) => {
  const id = c.req.param("id");
  const token = c.req.query("token") ?? "";

  const sessionRes = await db.execute({ sql: `SELECT * FROM sessions WHERE id = ?`, args: [id] });
  const session = sessionRes.rows[0];

  if (!session) return c.html(await errorPage("🔍", "Session not found", "This link may be invalid or already expired."), 404);
  if (String(session.creator_token) !== token) {
    return c.html(await errorPage("🔒", "Access denied", "You need the private results link to view responses."), 403);
  }

  const expired = isExpired(Number(session.expires_at));
  const qs = await getQuestions(id);
  const allResponses = await getResponses(id);

  const base = process.env.BASE_URL ?? "http://localhost:3000";
  const shareUrl = `${base}/respond/${id}`;
  const resultsUrl = `${base}/results/${id}?token=${token}`;

  const shareSection = expired ? "" : `
    <article style="margin-bottom:1.5rem;">
      <strong style="font-size:0.85rem;">Share with your team</strong>
      <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.4rem;">
        <input type="text" value="${shareUrl}" readonly id="share-copy" onclick="this.select()" style="background:var(--bg2); font-size:0.85rem;"/>
        <button type="button" onclick="copyField('share-copy', this)" style="flex-shrink:0; white-space:nowrap;">Copy</button>
      </div>
    </article>`;

  let content = "";
  if (allResponses.length === 0) {
    content = `
      <div class="results-empty">
        <div style="font-size:2rem; margin-bottom:0.5rem;">📭</div>
        <p>No responses yet. Share the link with your team.</p>
      </div>`;
  } else {
    content = qs.map(q => {
      const answers = allResponses
        .filter(r => String(r.question_id) === String(q.id))
        .map(r => String(r.answer));
      return resultsBlock(q, answers);
    }).join("\n");
  }

  const statusTag = expired
    ? `<mark style="background:var(--danger-bg,#fde8e8); color:var(--danger,#c0392b);">Expired</mark>`
    : `<mark>${timeLeft(Number(session.expires_at))}</mark>`;

  const refreshScript = expired ? "" : `<p style="text-align:center; font-size:0.8rem; color:var(--fg2); margin-top:1.5rem;">Auto-refreshes every 30s</p><script>setTimeout(()=>location.reload(),30000)</script>`;

  return c.html(await page(
    `Results — ${session.topic}`,
    "results",
    {
      TOPIC: esc(String(session.topic)),
      STATUS_TAG: statusTag,
      RESPONSE_COUNT: formatCount(allResponses.length),
      SESSION_STATUS: expired ? "Session closed" : "Session open",
      SHARE_SECTION: shareSection,
      CONTENT: content,
      REFRESH_SCRIPT: refreshScript,
    }
  ));
});

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

async function getResponses(sessionId: string) {
  const res = await db.execute({
    sql: `SELECT * FROM responses WHERE session_id = ? ORDER BY created_at ASC`,
    args: [sessionId],
  });
  return res.rows;
}
