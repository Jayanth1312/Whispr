import { db } from "./db";

export async function cleanupExpired(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.execute({
    sql: `DELETE FROM sessions WHERE expires_at < ?`,
    args: [now],
  });
}

// Run cleanup every hour
export function startCleanupJob(): void {
  setInterval(async () => {
    try {
      await cleanupExpired();
    } catch (e) {
      console.error("Cleanup failed:", e);
    }
  }, 60 * 60 * 1000);
}
