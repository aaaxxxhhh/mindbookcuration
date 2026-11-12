import { adminReady, passwordOk, sessionCookie, tooManyAttempts, readBody } from "../_lib/auth.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  if (!adminReady()) return res.status(503).json({ error: "ADMIN_PASSWORD 환경변수가 설정되지 않았어요." });
  if (await tooManyAttempts(req)) return res.status(429).json({ error: "로그인 시도가 너무 많아요. 15분 뒤 다시 시도해 주세요." });
  const { password } = readBody(req);
  if (!passwordOk(String(password || ""))) return res.status(401).json({ error: "비밀번호가 맞지 않아요." });
  res.setHeader("Set-Cookie", sessionCookie());
  res.status(200).json({ ok: true });
}
