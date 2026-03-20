// Vercel edge runtime entry — re-exports the Hono app
export { default } from "../src/index";
export const config = { runtime: "edge" };
