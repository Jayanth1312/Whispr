import { Hono } from "hono";
import { page } from "../lib/template";

export const homeRoute = new Hono();

homeRoute.get("/", async (c) => {
  return c.html(await page("Anonymous team feedback", "home"));
});
