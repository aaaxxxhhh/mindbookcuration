// 관리자: Firestore에 모인 책 반응·감정 통계 조회
import { isAdmin } from "../_lib/auth.ts";
import { firestoreReady, list } from "../_lib/firestore.ts";
import { kstDate } from "../_lib/stats.ts";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdmin(req)) return res.status(401).json({ error: "로그인이 필요해요." });
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
  if (!firestoreReady) return res.status(200).json({ ready: false });

  try {
    const [books, emotions, days] = await Promise.all([list("bookStats"), list("emotionStats"), list("dailyStats")]);
    const last7 = new Set(Array.from({ length: 7 }, (_, i) => kstDate(i)));
    const n = (v: any) => Math.max(0, Number(v) || 0);
    return res.status(200).json({
      ready: true,
      books: books
        .map((b) => ({ id: b.id, title: b.title || b.id, author: b.author || "", saves: n(b.saves), likes: n(b.likes), dislikes: n(b.dislikes) }))
        .sort((a, b) => b.saves + b.likes - (a.saves + a.likes))
        .slice(0, 10),
      emotions: emotions.map((e) => ({ name: e.name || e.id, count: n(e.count) })).sort((a, b) => b.count - a.count),
      days: days
        .filter((d) => last7.has(d.id))
        .map((d) => ({ day: d.id, recommends: n(d.recommends), saves: n(d.saves), likes: n(d.likes), dislikes: n(d.dislikes) }))
        .sort((a, b) => (a.day < b.day ? 1 : -1)),
    });
  } catch {
    return res.status(502).json({ error: "Firebase에서 통계를 불러오지 못했어요. 서비스 계정 설정을 확인해 주세요." });
  }
}
