import { db } from "@/lib/db";
import { isCron, unauthorized } from "@/lib/auth";
import { fetchInsights } from "@/lib/meta";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCron(req)) return unauthorized();
  const sb = db();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await sb.from("posts").select("id,platform,external_id")
    .eq("status", "published").gte("published_at", since).returns<any[]>();
  let n = 0;
  for (const p of data ?? []) {
    if (!p.external_id) continue;
    try {
      const m = await fetchInsights(p.platform, p.external_id);
      await sb.from("insights").upsert({ post_id: p.id, ...m, updated_at: new Date().toISOString() } as any);
      n++;
    } catch (e) { console.error("insights failed", p.id, e); }
  }
  return Response.json({ updated: n });
}
