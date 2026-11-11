import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";

export async function GET(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const sb = db();
  const [s, i] = await Promise.all([
    sb.from("sources").select("*").order("created_at"),
    sb.from("ideas").select("*").eq("used", false).order("created_at", { ascending: false }).limit(100),
  ]);
  return Response.json({ sources: s.data ?? [], ideas: i.data ?? [] });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const { url } = await req.json();
  try { new URL(url); } catch { return Response.json({ error: "invalid url" }, { status: 400 }); }
  const { data, error } = await db().from("sources").insert({ url } as any).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const { id } = await req.json();
  await db().from("sources").delete().eq("id", id);
  return Response.json({ ok: true });
}
