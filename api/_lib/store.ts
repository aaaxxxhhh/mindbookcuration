// Upstash Redis(REST) 저장소 — 추가 패키지 없이 fetch로 호출
// Vercel Marketplace에서 Upstash Redis를 연결하면 아래 환경변수가 자동으로 들어옴
const URL_ =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.MIND_CURATION_KV_REST_API_URL || "";
const TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.MIND_CURATION_KV_REST_API_TOKEN || "";

export const storeReady = Boolean(URL_ && TOKEN);

async function call(path: string, body: unknown): Promise<any> {
  if (!storeReady) throw new Error("STORE_NOT_CONFIGURED");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  try {
    const r = await fetch(URL_.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error("STORE_HTTP_" + r.status);
    return r.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 명령 하나 실행. 예: cmd(["GET","key"]) */
export async function cmd(args: (string | number)[]): Promise<any> {
  const out = await call("", args.map(String));
  if (out && out.error) throw new Error(out.error);
  return out?.result;
}

/** 여러 명령을 한 번에 실행 */
export async function pipeline(list: (string | number)[][]): Promise<any[]> {
  const out = await call("/pipeline", list.map((a) => a.map(String)));
  return (out || []).map((x: any) => x?.result);
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const v = await cmd(["GET", key]);
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await cmd(["SET", key, JSON.stringify(value)]);
}
