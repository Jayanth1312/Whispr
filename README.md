# whispr

Anonymous team feedback. No accounts. Auto-expires. Flies on any device.

**Stack:** Bun + Hono + HTMX + oat.ink + Turso (LibSQL)

---

## Project structure

```
src/
  index.ts              ← app entry point
  routes/
    home.ts             ← GET /
    create.ts           ← GET+POST /create, GET /create/add-question
    respond.ts          ← GET+POST /respond/:id
    results.ts          ← GET /results/:id?token=
  lib/
    db.ts               ← Turso client + schema init
    template.ts         ← HTML file renderer ({{VAR}} substitution)
    questions.ts        ← response field + results block builders for all 6 types
    utils.ts            ← ID gen, expiry helpers
    cleanup.ts          ← hourly expired session deleter
  templates/
    layout.html         ← base shell (oat.ink + HTMX loaded here)
    home.html
    create.html
    created.html        ← post-create confirmation
    respond.html
    respond-done.html   ← post-submit confirmation
    results.html
    error.html
    partials/
      question-block.html ← single question builder row
api/
  index.ts              ← Vercel edge entry point
```

---

## Local setup

### 1. Install Bun
```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Create a Turso database
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

turso auth login
turso db create whispr
turso db show whispr --url        # → TURSO_DATABASE_URL
turso db tokens create whispr     # → TURSO_AUTH_TOKEN
```

### 3. Configure environment
```bash
cp .env.example .env
# Fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
# Keep BASE_URL=http://localhost:3000 for local dev
```

### 4. Run
```bash
bun install
bun run dev
# → http://localhost:3000
```

The DB schema is created automatically on first run (no migration step needed).

---

## Deploy to Vercel

```bash
# Push to GitHub first
git init && git add . && git commit -m "init"
gh repo create whispr --public --push
```

Then on Vercel:
1. New Project → import repo
2. Add env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BASE_URL` (your Vercel domain)
3. Deploy — auto-deploys on every push to `main`

---

## Question types supported

| Type | How it's stored |
|------|----------------|
| Open-ended | Plain text |
| Rating (1–5) | Number string "1"–"5" |
| Yes / No | "Yes" or "No" |
| Multiple choice | Selected option text |
| Mood | Emoji character |
| Ranked priority | "Option:rank" pairs joined by `\|` |

## Page weight

| Asset | Size (gzipped) |
|-------|---------------|
| oat.ink CSS | ~6 KB |
| oat.ink JS | ~2.2 KB |
| HTMX | ~14 KB |
| HTML per page | ~4–8 KB |
| **Total first load** | **~30 KB** |

Loads in under 1s on 3G. Works on any device made in the last 15 years.
