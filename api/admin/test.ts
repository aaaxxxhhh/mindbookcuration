// 관리자 테스트: 저장 전 설정으로도 실제 AI 호출 결과를 확인 (통계에는 넣지 않음)
import { isAdmin, readBody } from "../_lib/auth.ts";
import { getConfig, sanitize } from "../_lib/config.ts";
import { runRecommendation } from "../_lib/engine.ts";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdmin(req)) return res.status(401).json({ error: "로그인이 필요해요." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const body = readBody(req);
  const text = String(body.text || "").trim().slice(0, 100);
  if (!text) return res.status(400).json({ error: "테스트 문장을 입력해 주세요." });
  const cfg = body.config ? sanitize(body.config, await getConfig()) : await getConfig();
  const t0 = Date.now();
  const { result, meta } = await runRecommendation(text, cfg, { allowAi: cfg.aiEnabled, skippedReason: cfg.aiEnabled ? undefined : "ai_off" });
  res.status(200).json({ result, meta, elapsedMs: Date.now() - t0 });
}
