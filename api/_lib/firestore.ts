// Firebase Firestore(REST) 연결 — 추가 패키지 없이 서비스 계정으로 토큰을 받아 호출
// Vercel 환경변수 FIREBASE_SERVICE_ACCOUNT 에 서비스 계정 JSON 전체를 넣으면 동작
import crypto from "crypto";

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

function readAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return { ...sa, private_key: String(sa.private_key).replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

const account = readAccount();
export const firestoreReady = Boolean(account);

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");
let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (!account) throw new Error("FIRESTORE_NOT_CONFIGURED");
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + body).sign(account.private_key);
  const r = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: head + "." + body + "." + b64url(sig),
    }).toString(),
  });
  if (!r.ok) throw new Error("FIRESTORE_TOKEN_" + r.status);
  const j = await r.json();
  cached = { token: j.access_token, exp: now + Number(j.expires_in || 3600) };
  return cached.token;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 4000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); }
  finally { clearTimeout(timer); }
}

const base = () => "projects/" + account!.project_id + "/databases/(default)/documents";
const api = (path: string) => "https://firestore.googleapis.com/v1/" + path;

async function call(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const r = await fetchWithTimeout(api(path), {
    ...init,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error("FIRESTORE_HTTP_" + r.status);
  return r.json();
}

export type Increment = { doc: string; fields: Record<string, number>; labels?: Record<string, string> };

/** 여러 문서의 숫자 필드를 한 번에 더하기 (문서가 없으면 새로 만듦) */
export async function increment(list: Increment[]): Promise<void> {
  if (!account || !list.length) return;
  const writes = list.map(({ doc, fields, labels = {} }) => {
    const name = base() + "/" + doc;
    const labelFields = Object.fromEntries(Object.entries(labels).map(([k, v]) => [k, { stringValue: v }]));
    return {
      update: { name, fields: { ...labelFields, updatedAt: { timestampValue: new Date().toISOString() } } },
      updateMask: { fieldPaths: [...Object.keys(labels), "updatedAt"] },
      updateTransforms: Object.entries(fields).map(([fieldPath, n]) => ({ fieldPath, increment: { integerValue: String(n) } })),
    };
  });
  await call(base() + ":commit", { method: "POST", body: JSON.stringify({ writes }) });
}

const toPlain = (fields: Record<string, any> = {}) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]: [string, any]) => [
    k,
    v.integerValue !== undefined ? Number(v.integerValue)
      : v.doubleValue !== undefined ? Number(v.doubleValue)
      : v.stringValue ?? v.timestampValue ?? null,
  ]));

/** 컬렉션 문서 목록 읽기 (최대 300개) */
export async function list(collection: string): Promise<{ id: string; [k: string]: any }[]> {
  if (!account) return [];
  const out: { id: string; [k: string]: any }[] = [];
  let pageToken = "";
  for (let i = 0; i < 3; i++) {
    const q = new URLSearchParams({ pageSize: "100", ...(pageToken ? { pageToken } : {}) });
    const j = await call(base() + "/" + collection + "?" + q.toString());
    (j.documents || []).forEach((d: any) => out.push({ id: String(d.name).split("/").pop() || "", ...toPlain(d.fields) }));
    pageToken = j.nextPageToken || "";
    if (!pageToken) break;
  }
  return out;
}

const enc = (v: any): any =>
  Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === "string" ? { stringValue: v }
  : v && typeof v === "object" ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
  : { nullValue: null };

const dec = (v: any): any =>
  v.arrayValue ? (v.arrayValue.values || []).map(dec)
  : v.mapValue ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]))
  : v.integerValue !== undefined ? Number(v.integerValue)
  : v.doubleValue !== undefined ? Number(v.doubleValue)
  : v.stringValue ?? v.timestampValue ?? null;

/** 문서 하나 읽기 (없으면 null) */
export async function getDoc(path: string): Promise<Record<string, any> | null> {
  if (!account) return null;
  try {
    const j = await call(base() + "/" + path);
    return Object.fromEntries(Object.entries(j.fields || {}).map(([k, x]) => [k, dec(x)]));
  } catch (e: any) {
    if (String(e?.message).endsWith("_404")) return null;
    throw e;
  }
}

/** 문서 하나 통째로 저장 (덮어쓰기) */
export async function setDoc(path: string, data: Record<string, any>): Promise<void> {
  if (!account) return;
  const fields = Object.fromEntries(Object.entries({ ...data, updatedAt: new Date().toISOString() }).map(([k, x]) => [k, enc(x)]));
  await call(base() + "/" + path, { method: "PATCH", body: JSON.stringify({ fields }) });
}
