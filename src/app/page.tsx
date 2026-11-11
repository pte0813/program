"use client";
import { useCallback, useEffect, useState } from "react";

type Post = { id: string; platform: string; body: string; status: string; scheduled_at: string | null; image_url: string | null; error: string | null; repeat_every_days: number | null };
const TABS = ["작성", "캘린더", "소스", "브랜드 보이스", "성과"] as const;

export default function Home() {
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("작성");
  const [msg, setMsg] = useState("");

  useEffect(() => { try { setToken(localStorage.getItem("admin") ?? ""); } catch {} }, []);
  const api = useCallback(async (path: string, method = "GET", body?: unknown) => {
    const r = await fetch(path, { method, headers: { "x-admin-token": token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "오류"); throw new Error(j.error); }
    setMsg(""); return j;
  }, [token]);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 16 }}>
      <h1>Posteady Lite</h1>
      <input type="password" placeholder="ADMIN_TOKEN" value={token}
        onChange={(e) => { setToken(e.target.value); try { localStorage.setItem("admin", e.target.value); } catch {} }} />
      <nav style={{ margin: "12px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} style={{ fontWeight: t === tab ? 700 : 400 }}>{t}</button>)}
      </nav>
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      {tab === "작성" && <Compose api={api} />}
      {tab === "캘린더" && <Calendar api={api} />}
      {tab === "소스" && <Sources api={api} />}
      {tab === "브랜드 보이스" && <Voice api={api} />}
      {tab === "성과" && <Insights api={api} />}
    </main>
  );
}
type Api = (p: string, m?: string, b?: unknown) => Promise<any>;
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, marginBottom: 12 };

function Compose({ api }: { api: Api }) {
  const [platform, setPlatform] = useState("threads"), [topic, setTopic] = useState(""), [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const load = useCallback(() => api("/api/drafts").then(setPosts).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const drafts = posts.filter((p) => p.status === "draft");
  return (<>
    <div style={box}>
      <select value={platform} onChange={(e) => setPlatform(e.target.value)}><option>threads</option><option>instagram</option></select>{" "}
      <input placeholder="주제" value={topic} onChange={(e) => setTopic(e.target.value)} />{" "}
      <input placeholder="또는 링크 URL" value={url} onChange={(e) => setUrl(e.target.value)} />{" "}
      <button disabled={busy} onClick={async () => { setBusy(true); try { await api("/api/drafts", "POST", { platform, topic, url: url || undefined }); setTopic(""); setUrl(""); await load(); } finally { setBusy(false); } }}>AI 초안 생성</button>
    </div>
    {drafts.map((p) => <DraftCard key={p.id} p={p} api={api} reload={load} />)}
  </>);
}
function DraftCard({ p, api, reload }: { p: Post; api: Api; reload: () => void }) {
  const [body, setBody] = useState(p.body), [at, setAt] = useState(""), [img, setImg] = useState(p.image_url ?? ""), [rep, setRep] = useState("");
  return (<div style={box}>
    <b>{p.platform}</b>
    <textarea style={{ width: "100%", minHeight: 100 }} value={body} onChange={(e) => setBody(e.target.value)} />
    <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />{" "}
    <input placeholder="이미지 URL (IG 필수)" value={img} onChange={(e) => setImg(e.target.value)} />{" "}
    <input placeholder="반복(일)" size={6} value={rep} onChange={(e) => setRep(e.target.value)} />{" "}
    <button disabled={!at} onClick={async () => { await api("/api/drafts", "PATCH", { id: p.id, body, image_url: img || null, repeat_every_days: rep ? Number(rep) : null, scheduled_at: new Date(at).toISOString() }); reload(); }}>예약</button>{" "}
    <button onClick={async () => { await api("/api/drafts", "PATCH", { id: p.id, body, image_url: img || null }); reload(); }}>저장</button>
  </div>);
}
function Calendar({ api }: { api: Api }) {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => { api("/api/drafts").then(setPosts).catch(() => {}); }, [api]);
  const list = posts.filter((p) => p.status !== "draft").sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  return <>{list.map((p) => <div key={p.id} style={box}>
    <b>{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString("ko-KR") : "-"}</b> · {p.platform} · {p.status}{p.repeat_every_days ? ` · ${p.repeat_every_days}일 반복` : ""}
    <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>{p.error && <small style={{ color: "crimson" }}>{p.error}</small>}
  </div>)}</>;
}
function Sources({ api }: { api: Api }) {
  const [d, setD] = useState<any>({ sources: [], ideas: [] }), [url, setUrl] = useState("");
  const load = useCallback(() => api("/api/sources").then(setD).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  return (<>
    <div style={box}><input placeholder="RSS 주소" size={50} value={url} onChange={(e) => setUrl(e.target.value)} />{" "}
      <button onClick={async () => { await api("/api/sources", "POST", { url }); setUrl(""); load(); }}>추가</button>
      {d.sources.map((s: any) => <div key={s.id}>{s.url} <button onClick={async () => { await api("/api/sources", "DELETE", { id: s.id }); load(); }}>삭제</button></div>)}</div>
    <h3>수집된 아이디어</h3>
    {d.ideas.map((i: any) => <div key={i.id} style={box}><a href={i.link} target="_blank" rel="noreferrer">{i.title}</a>{" "}
      {["threads", "instagram"].map((pf) => <button key={pf} onClick={async () => { await api("/api/drafts", "POST", { platform: pf, idea_id: i.id }); load(); }}>{pf} 초안</button>)}</div>)}
  </>);
}
function Voice({ api }: { api: Api }) {
  const [desc, setDesc] = useState(""), [samples, setSamples] = useState("");
  useEffect(() => { api("/api/voice").then((v) => { setDesc(v.description); setSamples((v.samples ?? []).join("\n---\n")); }).catch(() => {}); }, [api]);
  return (<div style={box}>
    <textarea style={{ width: "100%" }} rows={3} placeholder="브랜드/말투 설명" value={desc} onChange={(e) => setDesc(e.target.value)} />
    <textarea style={{ width: "100%" }} rows={10} placeholder="내가 쓴 글 샘플 (--- 로 구분)" value={samples} onChange={(e) => setSamples(e.target.value)} />
    <button onClick={() => api("/api/voice", "PUT", { description: desc, samples: samples.split(/\n---\n/).map((s) => s.trim()).filter(Boolean) })}>저장</button>
  </div>);
}
function Insights({ api }: { api: Api }) {
  const [d, setD] = useState<any>(null), [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/insights").then(setD).catch(() => {}); }, [api]);
  return (<>
    <button disabled={busy} onClick={async () => { setBusy(true); try { setD(await api("/api/insights?report=1")); } finally { setBusy(false); } }}>AI 리포트 생성</button>
    {d?.report && <div style={{ ...box, whiteSpace: "pre-wrap" }}>{d.report}</div>}
    {(d?.posts ?? []).map((p: any) => { const m = p.insights?.[0] ?? p.insights ?? {}; return <div key={p.id} style={box}>
      {p.platform} · 조회 {m.views ?? 0} · 좋아요 {m.likes ?? 0} · 댓글 {m.replies ?? 0} · 리포스트 {m.reposts ?? 0}
      <p>{p.body.slice(0, 120)}</p></div>; })}
  </>);
}
