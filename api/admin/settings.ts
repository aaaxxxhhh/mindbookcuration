// 관리자 설정 조회(GET) / 저장(PUT) + 연결 상태 + 최근 7일 사용 현황
import { isAdmin, readBody } from "../_lib/auth.ts";
import { getConfig, saveConfig, DEFAULT_CONFIG } from "../_lib/config.ts";
import { storeReady } from "../_lib/store.ts";
import { lastDays } from "../_lib/stats.ts";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdmin(req)) return res.status(401).json({ error: "로그인이 필요해요." });

  if (req.method === "GET") {
    let stats: any[] = [];
    try { stats = await lastDays(7); } catch { stats = []; }
    return res.status(200).json({
      config: await getConfig(),
      defaults: DEFAULT_CONFIG,
      env: {
        gemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
        claude: Boolean(process.env.ANTHROPIC_API_KEY),
        aladin: Boolean(process.env.ALADIN_TTB_KEY),
        store: storeReady,
      },
      stats,
    });
  }

  if (req.method === "PUT") {
    if (!storeReady) return res.status(503).json({ error: "저장소(Upstash Redis)가 연결되지 않아 설정을 저장할 수 없어요." });
    try {
      const saved = await saveConfig(readBody(req));
      return res.status(200).json({ config: saved });
    } catch {
      return res.status(500).json({ error: "설정 저장 중 오류가 났어요." });
    }
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
