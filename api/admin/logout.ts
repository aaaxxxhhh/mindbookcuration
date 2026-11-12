import { clearCookie } from "../_lib/auth.ts";

export default async function handler(_req: any, res: any) {
  res.setHeader("Set-Cookie", clearCookie());
  res.status(200).json({ ok: true });
}
