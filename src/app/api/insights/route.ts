import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";
import { analyzeReport } from "@/lib/ai";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const { data, error } = await db()
    .from("posts").select("id,platform,body,published_at,insights(views,likes,replies,reposts)")
    .eq("status", "published").order("published_at", { ascending: false }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const wantReport = new URL(req.url).searchParams.get("report") === "1";
  return Response.json({ posts: data, report: wantReport ? await analyzeReport(data) : null });
}
