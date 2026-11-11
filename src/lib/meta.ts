import { env } from "./env";

const TH = "https://graph.threads.net/v1.0";
const IG = "https://graph.facebook.com/v21.0";

async function call(url: string, method: "GET" | "POST", params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(method === "GET" ? `${url}?${qs}` : url, {
    method,
    headers: method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
    body: method === "POST" ? qs : undefined,
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json;
}

export async function publishThreads(text: string, imageUrl?: string | null): Promise<string> {
  const token = env("THREADS_ACCESS_TOKEN"), uid = env("THREADS_USER_ID");
  const c = await call(`${TH}/${uid}/threads`, "POST", {
    media_type: imageUrl ? "IMAGE" : "TEXT", text, ...(imageUrl ? { image_url: imageUrl } : {}), access_token: token,
  });
  const p = await call(`${TH}/${uid}/threads_publish`, "POST", { creation_id: c.id, access_token: token });
  return p.id as string;
}

export async function publishInstagram(caption: string, imageUrl?: string | null): Promise<string> {
  if (!imageUrl) throw new Error("Instagram 게시에는 image_url이 필요합니다");
  const token = env("IG_ACCESS_TOKEN"), uid = env("IG_USER_ID");
  const c = await call(`${IG}/${uid}/media`, "POST", { image_url: imageUrl, caption, access_token: token });
  const p = await call(`${IG}/${uid}/media_publish`, "POST", { creation_id: c.id, access_token: token });
  return p.id as string;
}

export async function fetchInsights(platform: "threads" | "instagram", id: string) {
  const out = { views: 0, likes: 0, replies: 0, reposts: 0 };
  const isTh = platform === "threads";
  const metric = isTh ? "views,likes,replies,reposts" : "reach,likes,comments,shares";
  const j = await call(`${isTh ? TH : IG}/${id}/insights`, "GET", {
    metric, access_token: env(isTh ? "THREADS_ACCESS_TOKEN" : "IG_ACCESS_TOKEN"),
  });
  for (const m of j.data ?? []) {
    const v = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
    if (m.name === "views" || m.name === "reach") out.views = v;
    if (m.name === "likes") out.likes = v;
    if (m.name === "replies" || m.name === "comments") out.replies = v;
    if (m.name === "reposts" || m.name === "shares") out.reposts = v;
  }
  return out;
}
