import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cache = new Map<string, string>();

export async function loadTemplate(name: string): Promise<string> {
  const path = join(process.cwd(), "src", "templates", `${name}.html`);
  if (process.env.NODE_ENV === "production" && cache.has(path)) {
    return cache.get(path)!;
  }
  const html = readFileSync(path, "utf-8");
  if (process.env.NODE_ENV === "production") cache.set(path, html);
  return html;
}

export async function render(name: string, vars: Record<string, string> = {}): Promise<string> {
  let html = await loadTemplate(name);
  for (const [k, v] of Object.entries(vars)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }
  return html;
}

export async function page(title: string, bodyName: string, vars: Record<string, string> = {}): Promise<string> {
  const body = await render(bodyName, vars);
  return render("layout", { TITLE: title, BODY: body });
}

export async function errorPage(icon: string, heading: string, message: string): Promise<string> {
  return page(heading, "error", { ICON: icon, HEADING: heading, MESSAGE: message });
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
