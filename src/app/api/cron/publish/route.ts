import { db } from "@/lib/db";
import { isCron, unauthorized } from "@/lib/auth";
import { publishInstagram, publishThreads } from "@/lib/meta";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCron(req)) return unauthorized();
  const sb = db();
  const { data: due } = await sb.from("posts").select("*")
    .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).limit(10).returns<any[]>();
  const results: unknown[] = [];
  for (const p of due ?? []) {
    // 중복 발행 방지: scheduled -> publishing 선점
    const { data: claimed } = await sb.from("posts").update({ status: "failed", error: "publishing" } as any)
      .eq("id", p.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;
    try {
      const ext = p.platform === "threads"
        ? await publishThreads(p.body, p.image_url) : await publishInstagram(p.body, p.image_url);
      await sb.from("posts").update({ status: "published", published_at: new Date().toISOString(), external_id: ext, error: null } as any).eq("id", p.id);
      if (p.repeat_every_days) {
        const next = new Date(new Date(p.scheduled_at).getTime() + p.repeat_every_days * 86400000).toISOString();
        await sb.from("posts").insert({ platform: p.platform, body: p.body, image_url: p.image_url, status: "scheduled", scheduled_at: next, repeat_every_days: p.repeat_every_days } as any);
      }
      results.push({ id: p.id, ok: true });
    } catch (e: any) {
      await sb.from("posts").update({ status: "failed", error: String(e.message).slice(0, 500) } as any).eq("id", p.id);
      results.push({ id: p.id, ok: false, error: e.message });
    }
  }
  return Response.json({ results });
}
