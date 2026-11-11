import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

const MODEL = "claude-sonnet-5-5";

export async function writeInBrandVoice(opts: {
  voice: { description: string; samples: string[] };
  platform: "threads" | "instagram";
  topic: string;
  sourceText?: string;
}): Promise<string> {
  const ai = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
  const limit = opts.platform === "threads" ? 500 : 2200;
  const system = [
    "당신은 아래 브랜드 보이스로 SNS 글을 쓰는 작가입니다.",
    `브랜드 설명: ${opts.voice.description}`,
    "말투 샘플:",
    ...opts.voice.samples.map((s, i) => `[${i + 1}] ${s}`),
    `규칙: ${opts.platform} 게시글 1개만 출력, ${limit}자 이내, 설명·따옴표·머리말 없이 본문만. 원문을 그대로 베끼지 말고 핵심을 재해석.`,
  ].join("\n");
  const msg = await ai.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system,
    messages: [{ role: "user", content: `주제: ${opts.topic}\n\n참고 자료:\n${opts.sourceText ?? "(없음)"}` }],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  return text.slice(0, limit);
}

export async function analyzeReport(rows: unknown): Promise<string> {
  const ai = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
  const msg = await ai.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{
      role: "user",
      content: `다음은 내 SNS 게시글 성과 데이터(JSON)입니다. 잘 된 글의 공통점 3가지와 다음 주 실행 계획 3가지를 한국어로 간결하게 정리해 주세요.\n${JSON.stringify(rows).slice(0, 20000)}`,
    }],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}
