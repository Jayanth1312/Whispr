export type QuestionType = "text" | "rating" | "yesno" | "choice" | "mood" | "rank";

export interface Question {
  id: number;
  session_id: string;
  text: string;
  type: QuestionType;
  options: string; // JSON array string for choice/rank
  position: number;
}

export function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

// Build the HTML input widget for responding to a question
export function responseField(q: Question): string {
  const opts = parseOptions(q.options);
  const label = `<label style="font-weight:600; margin-bottom:0.5rem; display:block;">${esc(q.text)}</label>`;
  const typeBadge = `<span class="q-type-badge">${typeLabel(q.type)}</span>`;

  switch (q.type) {
    case "text":
      return `
        <div class="question-block">
          ${typeBadge}${label}
          <textarea name="ans_${q.id}" rows="3" placeholder="Your answer..." maxlength="1000" style="resize:vertical;"></textarea>
        </div>`;

    case "rating":
      return `
        <div class="question-block">
          ${typeBadge}${label}
          <div class="rating-row">
            ${[1,2,3,4,5].map(n => `
              <input type="radio" name="ans_${q.id}" id="r_${q.id}_${n}" value="${n}" required/>
              <label for="r_${q.id}_${n}">${n}</label>
            `).join("")}
          </div>
        </div>`;

    case "yesno":
      return `
        <div class="question-block">
          ${typeBadge}${label}
          <div class="yesno-row">
            <input type="radio" name="ans_${q.id}" id="yn_${q.id}_y" value="Yes" required/>
            <label for="yn_${q.id}_y">Yes</label>
            <input type="radio" name="ans_${q.id}" id="yn_${q.id}_n" value="No" required/>
            <label for="yn_${q.id}_n">No</label>
          </div>
        </div>`;

    case "mood":
      const moods = ["😄", "🙂", "😐", "😕", "😞"];
      return `
        <div class="question-block">
          ${typeBadge}${label}
          <div class="mood-row">
            ${moods.map((m, i) => `
              <input type="radio" name="ans_${q.id}" id="m_${q.id}_${i}" value="${m}" required/>
              <label for="m_${q.id}_${i}">${m}</label>
            `).join("")}
          </div>
        </div>`;

    case "choice":
      return `
        <div class="question-block">
          ${typeBadge}${label}
          <div class="choices-list">
            ${opts.map((o, i) => `
              <label>
                <input type="radio" name="ans_${q.id}" value="${esc(o)}" required/>
                <span>${esc(o)}</span>
              </label>
            `).join("")}
          </div>
        </div>`;

    case "rank":
      return `
        <div class="question-block">
          ${typeBadge}${label}
          <p style="font-size:0.8rem; color:var(--fg2); margin-bottom:0.5rem;">Drag to reorder from most to least important.</p>
          <ul class="rank-list" id="rank_${q.id}">
            ${opts.map((o, i) => `
              <li class="rank-item" draggable="true" data-value="${esc(o)}">
                <span class="rank-handle">&#9776;</span>
                <span class="rank-num">${i+1}</span>
                <span>${esc(o)}</span>
                <input type="hidden" name="ans_${q.id}_${i}" value="${esc(o)}:${i+1}"/>
              </li>
            `).join("")}
          </ul>
        </div>`;

    default:
      return "";
  }
}

// Build the results display for a question
export function resultsBlock(q: Question, answers: string[]): string {
  const opts = parseOptions(q.options);
  const label = `<div style="font-weight:600; margin-bottom:0.5rem;">${esc(q.text)}</div>`;
  const typeBadge = `<span class="q-type-badge">${typeLabel(q.type)}</span>`;
  const countBadge = `<span class="stat-chip">${answers.length} ${answers.length === 1 ? "answer" : "answers"}</span>`;

  if (answers.length === 0) {
    return `<article><div class="stat-row">${typeBadge}${countBadge}</div>${label}<p style="color:var(--fg2); font-style:italic; font-size:0.9rem;">No answers yet.</p></article>`;
  }

  let content = "";

  switch (q.type) {
    case "text":
      content = answers.map(a => `<div class="answer-card">${esc(a)}</div>`).join("");
      break;

    case "rating": {
      const counts = [1,2,3,4,5].map(n => answers.filter(a => a === String(n)).length);
      const avg = (answers.reduce((s, a) => s + (parseInt(a) || 0), 0) / answers.length).toFixed(1);
      content = `<div class="stat-row"><span class="stat-chip">Avg: ${avg} / 5</span></div>`;
      content += counts.map((c, i) => {
        const pct = answers.length > 0 ? Math.round((c / answers.length) * 100) : 0;
        return `
          <div class="bar-wrap">
            <div class="bar-label"><span>${i+1} star</span><span>${c} (${pct}%)</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join("");
      break;
    }

    case "yesno": {
      const yes = answers.filter(a => a === "Yes").length;
      const no = answers.filter(a => a === "No").length;
      const yesPct = Math.round((yes / answers.length) * 100);
      const noPct = Math.round((no / answers.length) * 100);
      content = `
        <div class="bar-wrap">
          <div class="bar-label"><span>Yes</span><span>${yes} (${yesPct}%)</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${yesPct}%"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-label"><span>No</span><span>${no} (${noPct}%)</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${noPct}%; background:var(--danger, #c0392b);"></div></div>
        </div>`;
      break;
    }

    case "mood": {
      const moods = ["😄","🙂","😐","😕","😞"];
      content = moods.map(m => {
        const c = answers.filter(a => a === m).length;
        const pct = Math.round((c / answers.length) * 100);
        return `
          <div class="bar-wrap">
            <div class="bar-label"><span>${m}</span><span>${c} (${pct}%)</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join("");
      break;
    }

    case "choice": {
      content = opts.map(o => {
        const c = answers.filter(a => a === o).length;
        const pct = Math.round((c / answers.length) * 100);
        return `
          <div class="bar-wrap">
            <div class="bar-label"><span>${esc(o)}</span><span>${c} (${pct}%)</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join("");
      break;
    }

    case "rank": {
      // Parse "Option:rank" format and compute average rank per option
      const scores: Record<string, number[]> = {};
      for (const a of answers) {
        const [opt, rank] = a.split(":");
        if (opt && rank) {
          if (!scores[opt]) scores[opt] = [];
          scores[opt].push(parseInt(rank));
        }
      }
      const sorted = Object.entries(scores)
        .map(([opt, ranks]) => ({ opt, avg: ranks.reduce((s, r) => s + r, 0) / ranks.length }))
        .sort((a, b) => a.avg - b.avg);
      content = sorted.map((item, i) => `
        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem 0; border-bottom:1px solid var(--border);">
          <span class="rank-num" style="background:var(--brand); color:#fff; border-radius:50%; width:1.5rem; height:1.5rem; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0;">${i+1}</span>
          <span style="flex:1;">${esc(item.opt)}</span>
          <span style="font-size:0.8rem; color:var(--fg2);">avg rank ${item.avg.toFixed(1)}</span>
        </div>`).join("");
      break;
    }
  }

  return `<article><div class="stat-row">${typeBadge}${countBadge}</div>${label}${content}</article>`;
}

function typeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    text: "open-ended",
    rating: "rating",
    yesno: "yes / no",
    choice: "multiple choice",
    mood: "mood",
    rank: "ranking",
  };
  return labels[type] ?? type;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
