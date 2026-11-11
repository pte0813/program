import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";
import { writeInBrandVoice } from "@/lib/ai";
import { readArticle } from "@/lib/rss";

export const maxDuration = 60;

// POST { platform, topic?, url?, idea_id? } -> 브랜드 보이스로 초안 생성
export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const b = await req.json();
  if (b.platform !== "threads" && b.platform !== "instagram")
    return Response.json({ error: "platform must be threads|instagram" }, { status: 400 });

  const sb = db();
  let topic: string = b.topic ?? "";
  let sourceText: string | undefined;
  let ideaId: string | undefined = b.idea_id;

  if (ideaId) {
    const { data } = await sb.from("ideas").select("title,link,summary").eq("id", ideaId).single<any>();
    if (!data) return Response.json({ error: "idea not found" }, { status: 404 });
    topic ||= data.title;
    sourceText = data.summary ?? undefined;
  } else if (b.url) {
    sourceText = await readArticle(b.url);
    topic ||= b.url;
  }
  if (!topic) return Response.json({ error: "topic, url or idea_id required" }, { status: 400 });

  const { data: voice } = await sb.from("brand_voice").select("description,samples").limit(1).maybeSingle<any>();
  const body = await writeInBrandVoice({
    voice: voice ?? { description: "친근하고 간결한 톤", samples: [] },
    platform: b.platform, topic, sourceText,
  });
  const { data, error } = await sb.from("posts")
    .insert({ platform: b.platform, body, idea_id: ideaId ?? null, status: "draft" } as any).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (ideaId) await sb.from("ideas").update({ used: true } as any).eq("id", ideaId);
  return Response.json(data);
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const { data, error } = await db().from("posts").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// PATCH { id, body?, scheduled_at?, repeat_every_days?, image_url?, status? } -> 수정/예약
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const { id, ...rest } = await req.json();
  const allowed = ["body", "scheduled_at", "repeat_every_days", "image_url", "status"];
  const patch = Object.fromEntries(Object.entries(rest).filter(([k]) => allowed.includes(k)));
  if (patch.scheduled_at && !patch.status) patch.status = "scheduled";
  if (patch.status && !["draft", "scheduled"].includes(patch.status as string))
    return Response.json({ error: "invalid status" }, { status: 400 });
  const { data, error } = await db().from("posts").update(patch as any).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
