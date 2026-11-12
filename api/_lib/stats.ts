// 하루 단위 사용 현황 (입력 문장은 저장하지 않고 숫자만 셈)
import { pipeline, cmd, storeReady } from "./store.ts";

export type StatField =
  | "total" | "ai_calls" | "gemini_ok" | "claude_ok" | "ai_error"
  | "fallback" | "crisis" | "ai_off" | "limited";

/** 한국 시간 기준 날짜 YYYY-MM-DD */
export function kstDate(offsetDays = 0): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 - offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}
const key = (day: string) => `mbc:stats:${day}`;

export async function bump(fields: StatField[]): Promise<void> {
  if (!storeReady || !fields.length) return;
  const k = key(kstDate());
  try {
    await pipeline([...fields.map((f) => ["HINCRBY", k, f, 1]), ["EXPIRE", k, 60 * 60 * 24 * 40]]);
  } catch { /* 통계 실패는 서비스에 영향 주지 않음 */ }
}

export async function todayAiCalls(): Promise<number> {
  if (!storeReady) return 0;
  try { return Number(await cmd(["HGET", key(kstDate()), "ai_calls"])) || 0; } catch { return 0; }
}

export async function lastDays(n = 7): Promise<{ day: string; [k: string]: number | string }[]> {
  if (!storeReady) return [];
  const days = Array.from({ length: n }, (_, i) => kstDate(i));
  const rows = await pipeline(days.map((d) => ["HGETALL", key(d)]));
  return days.map((day, i) => {
    const flat: string[] = rows[i] || [];
    const obj: { day: string; [k: string]: number | string } = { day };
    for (let j = 0; j < flat.length; j += 2) obj[flat[j]] = Number(flat[j + 1]) || 0;
    return obj;
  });
}
