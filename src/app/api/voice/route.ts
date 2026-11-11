import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";

export async function GET(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const { data } = await db().from("brand_voice").select("*").limit(1).maybeSingle();
  return Response.json(data ?? { description: "", samples: [] });
}

export async function PUT(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const { description, samples } = await req.json();
  const sb = db();
  const { data: cur } = await sb.from("brand_voice").select("id").limit(1).maybeSingle<any>();
  const row = { description: String(description ?? ""), samples: (samples ?? []).map(String).slice(0, 20) } as any;
  const { data, error } = cur
    ? await sb.from("brand_voice").update(row).eq("id", cur.id).select().single()
    : await sb.from("brand_voice").insert(row).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
