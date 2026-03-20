export function generateId(len = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

export function expiryFromHours(hours: number): number {
  return Math.floor(Date.now() / 1000) + hours * 3600;
}

export function isExpired(expiresAt: number): boolean {
  return Math.floor(Date.now() / 1000) > expiresAt;
}

export function timeLeft(expiresAt: number): string {
  const secs = expiresAt - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "Expired";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function formatCount(n: number): string {
  return n === 1 ? "1 response" : `${n} responses`;
}
