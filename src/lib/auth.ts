import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function isAdmin(req: Request) {
  return same(req.headers.get("x-admin-token") ?? "", env("ADMIN_TOKEN"));
}
export function isCron(req: Request) {
  return same(req.headers.get("authorization") ?? "", `Bearer ${env("CRON_SECRET")}`);
}
export const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
