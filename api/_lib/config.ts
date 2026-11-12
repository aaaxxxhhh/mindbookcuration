// 관리자 페이지에서 바꾸는 AI 설정 (저장소가 없으면 기본값 사용)
import { getJSON, setJSON, storeReady } from "./store.ts";

export type ProviderOrder = "gemini-first" | "claude-first" | "gemini-only" | "claude-only";

export interface AiConfig {
  aiEnabled: boolean;        // AI 사용 여부 (끄면 기본 규칙만)
  providerOrder: ProviderOrder;
  geminiModel: string;
  claudeModel: string;
  timeoutSec: number;        // AI 하나당 응답 제한 시간(초), 2~7
  dailyLimit: number;        // 하루 AI 호출 한도 (0 = 제한 없음)
  extraRules: string;        // 프롬프트에 덧붙일 추가 지시
  bannedWords: string[];     // 공감 문장·추천 이유 금칙어
  crisisWords: string[];     // 기본 위기 키워드에 추가할 단어
  updatedAt?: string;
}

export const DEFAULT_CONFIG: AiConfig = {
  aiEnabled: true,
  providerOrder: "gemini-first",
  geminiModel: "gemini-3.8-flash",
  claudeModel: "claude-haiku-5-5",
  timeoutSec: 7,
  dailyLimit: 1000,
  extraRules: "",
  bannedWords: ["우울증", "치료", "병원", "진단", "처방", "약물", "정신과"],
  crisisWords: [],
};

const KEY = "mbc:config";
let cache: { at: number; value: AiConfig } | null = null;

const ORDERS: ProviderOrder[] = ["gemini-first", "claude-first", "gemini-only", "claude-only"];
const words = (v: unknown) =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[,\n]/))
    .map((s) => String(s).trim())
    .filter((s) => s && s.length <= 20)
    .slice(0, 50);
const model = (v: unknown, d: string) => {
  const s = String(v ?? "").trim();
  return /^[a-zA-Z0-9._-]{3,60}$/.test(s) ? s : d;
};

/** 입력값 검사 후 안전한 설정으로 정리 */
export function sanitize(input: Partial<AiConfig>, base: AiConfig = DEFAULT_CONFIG): AiConfig {
  const n = (v: unknown, min: number, max: number, d: number) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : d;
  };
  return {
    aiEnabled: typeof input.aiEnabled === "boolean" ? input.aiEnabled : base.aiEnabled,
    providerOrder: ORDERS.includes(input.providerOrder as ProviderOrder)
      ? (input.providerOrder as ProviderOrder) : base.providerOrder,
    geminiModel: model(input.geminiModel ?? base.geminiModel, base.geminiModel),
    claudeModel: model(input.claudeModel ?? base.claudeModel, base.claudeModel),
    timeoutSec: n(input.timeoutSec ?? base.timeoutSec, 2, 7, base.timeoutSec),
    dailyLimit: n(input.dailyLimit ?? base.dailyLimit, 0, 100000, base.dailyLimit),
    extraRules: String(input.extraRules ?? base.extraRules).slice(0, 1000),
    bannedWords: input.bannedWords !== undefined ? words(input.bannedWords) : base.bannedWords,
    crisisWords: input.crisisWords !== undefined ? words(input.crisisWords) : base.crisisWords,
    updatedAt: base.updatedAt,
  };
}

export async function getConfig(): Promise<AiConfig> {
  if (cache && Date.now() - cache.at < 15000) return cache.value;
  let value = DEFAULT_CONFIG;
  if (storeReady) {
    try {
      const saved = await getJSON<Partial<AiConfig>>(KEY);
      if (saved) value = { ...sanitize(saved), updatedAt: saved.updatedAt };
    } catch { /* 저장소 오류 시 기본값 */ }
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveConfig(input: Partial<AiConfig>): Promise<AiConfig> {
  const current = await getConfig();
  const next = { ...sanitize(input, current), updatedAt: new Date().toISOString() };
  await setJSON(KEY, next);
  cache = { at: Date.now(), value: next };
  return next;
}
