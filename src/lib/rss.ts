import { XMLParser } from "fast-xml-parser";

export type FeedItem = { title: string; link: string; summary: string };

export async function readFeed(url: string): Promise<FeedItem[]> {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("invalid protocol");
  const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  const x = new XMLParser({ ignoreAttributes: false }).parse(await res.text());
  const items = x?.rss?.channel?.item ?? x?.feed?.entry ?? [];
  return (Array.isArray(items) ? items : [items]).slice(0, 20).map((i: any) => ({
    title: String(i.title?.["#text"] ?? i.title ?? "").trim(),
    link: String(i.link?.["@_href"] ?? i.link ?? "").trim(),
    summary: String(i.description ?? i.summary?.["#text"] ?? i.summary ?? "").replace(/<[^>]+>/g, "").slice(0, 1500),
  })).filter((i: FeedItem) => i.title && i.link);
}

export async function readArticle(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 6000);
}
