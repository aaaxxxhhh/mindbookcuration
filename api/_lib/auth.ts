// 관리자 로그인: 비밀번호 확인 후 8시간짜리 서명 쿠키 발급
import crypto from "crypto";
import { cmd, storeReady } from "./store.ts";

const COOKIE = "mbc_admin";
const MAX_AGE = 60 * 60 * 8;

const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("base64url");
const sha = (v: string) => crypto.createHash("sha256").update(v).digest();

export const adminReady = () => Boolean(process.env.ADMIN_PASSWORD);

export function passwordOk(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD || "";
  if (!pw) return false;
  return crypto.timingSafeEqual(sha(String(input)), sha(pw));
}

export function sessionCookie(): string {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const token = `${exp}.${sign(exp)}`;
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(req: any): boolean {
  if (!adminReady()) return false;
  const raw = String(req.headers?.cookie || "");
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig) return false;
  const good = sign(exp);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(exp) > Date.now() / 1000;
}

/** 로그인 시도 제한: 같은 IP 15분에 10회 */
export async function tooManyAttempts(req: any): Promise<boolean> {
  if (!storeReady) return false;
  const ip = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  try {
    const k = `mbc:login:${ip}`;
    const n = Number(await cmd(["INCR", k]));
    if (n === 1) await cmd(["EXPIRE", k, 900]);
    return n > 10;
  } catch { return false; }
}

export function readBody(req: any): any {
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body || {};
}
