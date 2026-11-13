// 사용자 반응 수집 API — 누구인지 알 수 없는 숫자 통계만 Firestore에 모음
// 입력 문장, IP, 기기 정보는 Firestore에 저장하지 않음
import { BY_ID, EMOS } from "../src/data/catalog.ts";
import { firestoreReady, increment, type Increment } from "./_lib/firestore.ts";
import { kstDate } from "./_lib/stats.ts";
import { cmd, storeReady } from "./_lib/store.ts";
import { readBody } from "./_lib/auth.ts";

const EMO_NAMES = new Set(EMOS.map((e) => e.name));
const FEEDBACK = new Set([-1, 0, 1]);

/** 같은 IP 1분에 60회 초과 시 기록하지 않음 (저장소 연결 시에만) */
async function tooMany(req: any): Promise<boolean> {
  if (!storeReady) return false;
  const ip = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  try {
    const k = "mbc:track:" + ip;
    const n = Number(await cmd(["INCR", k]));
    if (n === 1) await cmd(["EXPIRE", k, 60]);
    return n > 60;
  } catch { return false; }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  if (!firestoreReady) return res.status(204).end();
  if (await tooMany(req)) return res.status(204).end();

  const b = readBody(req);
  const day = "dailyStats/" + kstDate();
  const ops: Increment[] = [];
  const book = typeof b.bookId === "string" && BY_ID[b.bookId] ? BY_ID[b.bookId] : null;
  const bookDoc = (fields: Record<string, number>): Increment => ({
    doc: "bookStats/" + book!.id, fields, labels: { title: book!.t, author: book!.a },
  });

  if ((b.type === "save" || b.type === "unsave") && book) {
    const n = b.type === "save" ? 1 : -1;
    ops.push(bookDoc({ saves: n }), { doc: day, fields: { saves: n } });
  } else if (b.type === "feedback" && book && FEEDBACK.has(b.from) && FEEDBACK.has(b.to) && b.from !== b.to) {
    const f: Record<string, number> = {};
    if (b.from === 1) f.likes = -1;
    if (b.from === -1) f.dislikes = -1;
    if (b.to === 1) f.likes = (f.likes || 0) + 1;
    if (b.to === -1) f.dislikes = (f.dislikes || 0) + 1;
    ops.push(bookDoc(f), { doc: day, fields: f });
  } else if (b.type === "recommend" && Array.isArray(b.emotions)) {
    const emos = b.emotions.filter((e: unknown) => typeof e === "string" && EMO_NAMES.has(e)).slice(0, 3) as string[];
    if (!emos.length) return res.status(204).end();
    emos.forEach((e) => ops.push({ doc: "emotionStats/" + e, fields: { count: 1 }, labels: { name: e } }));
    ops.push({ doc: day, fields: { recommends: 1 } });
  } else {
    return res.status(400).json({ error: "Invalid event" });
  }

  try { await increment(ops); } catch { /* 통계 실패는 서비스에 영향 주지 않음 */ }
  res.status(204).end();
}
