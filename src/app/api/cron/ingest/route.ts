import { db } from "@/lib/db";
import { isCron, unauthorized } from "@/lib/auth";
import { readFeed } from "@/lib/rss";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCron(req)) return unauthorized();
  const sb = db();
  const { data: sources } = await sb.from("sources").select("id,url").returns<{ id: string; url: string }[]>();
  let added = 0;
  for (const s of sources ?? []) {
    try {
      const items = await readFeed(s.url);
      const { data } = await sb.from("ideas")
        .upsert(items.map((i) => ({ ...i, source_id: s.id })) as any, { onConflict: "link", ignoreDuplicates: true })
        .select("id");
      added += data?.length ?? 0;
      await sb.from("sources").update({ last_fetched_at: new Date().toISOString() } as any).eq("id", s.id);
    } catch (e) { console.error("ingest failed", s.url, e); }
  }
  return Response.json({ added });
}
