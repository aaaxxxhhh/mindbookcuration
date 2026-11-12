// 사용자 추천 API — 관리자 설정(켜기/끄기, 순서, 모델, 한도 등)을 반영
import { getConfig } from "./_lib/config.ts";
import { runRecommendation } from "./_lib/engine.ts";
import { bump, todayAiCalls, type StatField } from "./_lib/stats.ts";
import { readBody } from "./_lib/auth.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  const body = readBody(req);
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 100) : "";
  if (!text) {
    res.status(400).json({ error: "Text is required" });
    return;
  }

  const cfg = await getConfig();
  let allowAi = cfg.aiEnabled;
  let skipped: "ai_off" | "limited" | undefined = cfg.aiEnabled ? undefined : "ai_off";
  if (allowAi && cfg.dailyLimit > 0 && (await todayAiCalls()) >= cfg.dailyLimit) {
    allowAi = false;
    skipped = "limited";
  }

  const { result, meta } = await runRecommendation(text, cfg, { allowAi, skippedReason: skipped });

  const f: StatField[] = ["total"];
  if (meta.attempts.some((a) => a.error !== "API 키 없음")) f.push("ai_calls");
  meta.attempts.forEach((a) => {
    if (a.ok) f.push(a.provider === "gemini" ? "gemini_ok" : "claude_ok");
    else if (a.error !== "API 키 없음") f.push("ai_error");
  });
  if (!meta.usedAi) f.push("fallback");
  if (result.crisis) f.push("crisis");
  if (skipped) f.push(skipped);
  await bump(f);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(result);
}
