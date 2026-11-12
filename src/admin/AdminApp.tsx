import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type Order = "gemini-first" | "claude-first" | "gemini-only" | "claude-only";
interface Config {
  aiEnabled: boolean; providerOrder: Order; geminiModel: string; claudeModel: string;
  timeoutSec: number; dailyLimit: number; extraRules: string; bannedWords: string[]; crisisWords: string[];
  updatedAt?: string;
}
interface Env { gemini: boolean; claude: boolean; aladin: boolean; store: boolean }
interface Stat { day: string; [k: string]: number | string }
interface TestOut {
  result: { emotions: string[]; empathy: string; reasons: Record<string, string>; crisis: boolean; source: string };
  meta: { attempts: { provider: string; ok: boolean; ms: number; error?: string }[]; usedAi: boolean; skippedReason?: string };
  elapsedMs: number;
}

const ORDER_LABEL: Record<Order, string> = {
  "gemini-first": "Gemini 먼저 → 실패 시 Claude",
  "claude-first": "Claude 먼저 → 실패 시 Gemini",
  "gemini-only": "Gemini만 사용",
  "claude-only": "Claude만 사용",
};

const card: CSSProperties = { background: "var(--surface)", borderRadius: 14, padding: "18px 16px 16px", border: "1px solid var(--line)" };
const label: CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "var(--muted)", margin: "0 0 6px" };
const input: CSSProperties = { width: "100%", font: "inherit", fontSize: 15, padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--line)", background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" };
const btn: CSSProperties = { font: "inherit", fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 10, border: 0, background: "var(--accent)", color: "var(--accent-ink)", cursor: "pointer", whiteSpace: "nowrap" };
const ghost: CSSProperties = { ...btn, background: "transparent", color: "var(--ink)", border: "1.5px solid var(--line)" };
const help: CSSProperties = { fontSize: 12.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 };

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || "요청 실패"), { status: r.status });
  return data;
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section style={{ ...card, marginBottom: 16 }}>
      <h2 style={{ fontSize: 17, margin: "0 0 4px" }}>{title}</h2>
      {desc && <p style={{ ...help, margin: "0 0 16px" }}>{desc}</p>}
      {children}
    </section>
  );
}

function Dot({ on, text }: { on: boolean; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, marginRight: 16 }}>
      <span style={{ width: 9, height: 9, borderRadius: 9, background: on ? "#2E8B57" : "#B0533D" }} />
      {text} {on ? "연결됨" : "미연결"}
    </span>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saved, setSaved] = useState<Config | null>(null);
  const [defaults, setDefaults] = useState<Config | null>(null);
  const [env, setEnv] = useState<Env | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [busy, setBusy] = useState(false);
  const [testText, setTestText] = useState("요즘 혼자인 것 같고 너무 지쳐");
  const [testOut, setTestOut] = useState<TestOut | null>(null);

  useEffect(() => {
    document.title = "관리자 · 감정 책 추천";
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    load();
  }, []);

  async function load() {
    try {
      const d = await api("/api/admin/settings");
      setCfg(d.config); setSaved(d.config); setDefaults(d.defaults); setEnv(d.env); setStats(d.stats || []);
      setAuthed(true);
    } catch (e: any) {
      if (e.status === 401) setAuthed(false); else { setAuthed(false); setMsg({ type: "err", text: e.message }); }
    }
  }

  async function login() {
    setBusy(true); setMsg(null);
    try { await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: pw }) }); setPw(""); await load(); }
    catch (e: any) { setMsg({ type: "err", text: e.message }); }
    finally { setBusy(false); }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAuthed(false); setCfg(null);
  }

  async function save() {
    if (!cfg) return;
    setBusy(true); setMsg(null);
    try {
      const d = await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(cfg) });
      setCfg(d.config); setSaved(d.config);
      setMsg({ type: "ok", text: "저장했어요. 약 15초 안에 서비스에 반영돼요." });
    } catch (e: any) { setMsg({ type: "err", text: e.message }); }
    finally { setBusy(false); }
  }

  async function runTest() {
    if (!cfg) return;
    setBusy(true); setTestOut(null); setMsg(null);
    try { setTestOut(await api("/api/admin/test", { method: "POST", body: JSON.stringify({ text: testText, config: cfg }) })); }
    catch (e: any) { setMsg({ type: "err", text: e.message }); }
    finally { setBusy(false); }
  }

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => (c ? { ...c, [k]: v } : c));
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved);
  const page: CSSProperties = { maxWidth: 860, margin: "0 auto", padding: "40px 20px 80px", color: "var(--ink)", fontFamily: "'Noto Sans KR', system-ui, sans-serif" };

  if (authed === null) return <main style={page}><p>불러오는 중…</p></main>;

  if (!authed) {
    return (
      <main style={{ ...page, maxWidth: 420 }}>
        <h1 style={{ fontSize: 26, margin: "40px 0 6px" }}>관리자 로그인</h1>
        <p style={{ ...help, margin: "0 0 20px" }}>AI 기능 설정을 바꾸려면 관리자 비밀번호를 입력하세요.</p>
        <form onSubmit={(e) => { e.preventDefault(); login(); }} style={card}>
          <label style={label} htmlFor="pw">비밀번호</label>
          <input id="pw" type="password" autoComplete="current-password" style={input} value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="submit" style={{ ...btn, width: "100%", marginTop: 14 }} disabled={busy || !pw}>{busy ? "확인 중…" : "로그인"}</button>
          {msg && <p style={{ ...help, color: "#B0533D", marginTop: 12 }}>{msg.text}</p>}
        </form>
      </main>
    );
  }

  if (!cfg || !env || !defaults) return null;
  const today = stats[0] || { day: "" };
  const num = (k: string) => Number(today[k] || 0);
  const aiOk = num("gemini_ok") + num("claude_ok");

  return (
    <main style={page}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>AI 기능 관리</h1>
          <p style={{ ...help, margin: "4px 0 0" }}>마지막 저장: {cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString("ko-KR") : "저장 기록 없음 (기본값 사용 중)"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/" style={{ ...ghost, textDecoration: "none" }}>서비스 보기</a>
          <button style={ghost} onClick={logout}>로그아웃</button>
        </div>
      </header>

      <Section title="연결 상태" desc="API 키와 저장소는 Vercel 환경변수에서 관리해요. 이 화면에서는 키를 보거나 바꿀 수 없어요.">
        <Dot on={env.gemini} text="Gemini" /><Dot on={env.claude} text="Claude" /><Dot on={env.aladin} text="알라딘 표지" /><Dot on={env.store} text="설정 저장소" />
        {!env.store && <p style={{ ...help, color: "#B0533D" }}>설정 저장소(Upstash Redis)가 없어 설정 저장과 사용 현황 기록이 꺼져 있어요.</p>}
      </Section>

      <Section title="오늘 사용 현황" desc={`한국 시간 ${today.day || "-"} 기준 · 입력 문장은 저장하지 않고 횟수만 기록해요.`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
          {[
            ["전체 추천 요청", num("total")],
            ["AI 성공", aiOk],
            ["기본 규칙으로 처리", num("fallback")],
            ["AI 오류", num("ai_error")],
            ["위기 감지", num("crisis")],
            ["AI 호출 / 하루 한도", `${num("ai_calls")} / ${cfg.dailyLimit || "제한 없음"}`],
          ].map(([k, v]) => (
            <div key={String(k)} style={{ background: "var(--bg)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{k}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        {stats.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, whiteSpace: "nowrap" }}>
              <thead><tr style={{ textAlign: "left", color: "var(--muted)" }}>
                {["날짜", "전체", "Gemini 성공", "Claude 성공", "기본 규칙", "AI 오류", "위기 감지", "AI 꺼짐", "한도 초과"].map((h) => <th key={h} style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)" }}>{h}</th>)}
              </tr></thead>
              <tbody>{stats.map((s) => (
                <tr key={s.day}>{[s.day, s.total, s.gemini_ok, s.claude_ok, s.fallback, s.ai_error, s.crisis, s.ai_off, s.limited].map((v, i) => (
                  <td key={i} style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)" }}>{v ?? 0}</td>))}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="AI 동작 설정">
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, marginBottom: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={cfg.aiEnabled} onChange={(e) => set("aiEnabled", e.target.checked)} style={{ width: 20, height: 20 }} />
          AI 사용 {cfg.aiEnabled ? "켜짐" : "꺼짐 (모든 추천을 기본 규칙으로 처리)"}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          <div>
            <label style={label} htmlFor="order">AI 사용 순서</label>
            <select id="order" style={input} value={cfg.providerOrder} onChange={(e) => set("providerOrder", e.target.value as Order)}>
              {(Object.keys(ORDER_LABEL) as Order[]).map((o) => <option key={o} value={o}>{ORDER_LABEL[o]}</option>)}
            </select>
          </div>
          <div>
            <label style={label} htmlFor="to">AI 하나당 응답 제한 시간 (초)</label>
            <input id="to" type="number" min={2} max={7} style={input} value={cfg.timeoutSec} onChange={(e) => set("timeoutSec", Number(e.target.value))} />
            <p style={help}>2~7초. 두 AI를 차례로 시도해도 화면 제한(15초) 안에 끝나도록 최대 7초예요.</p>
          </div>
          <div>
            <label style={label} htmlFor="gm">Gemini 모델 이름</label>
            <input id="gm" style={input} value={cfg.geminiModel} onChange={(e) => set("geminiModel", e.target.value)} />
            <p style={help}>기본값: {defaults.geminiModel}</p>
          </div>
          <div>
            <label style={label} htmlFor="cm">Claude 모델 이름</label>
            <input id="cm" style={input} value={cfg.claudeModel} onChange={(e) => set("claudeModel", e.target.value)} />
            <p style={help}>기본값: {defaults.claudeModel}</p>
          </div>
          <div>
            <label style={label} htmlFor="lim">하루 AI 호출 한도</label>
            <input id="lim" type="number" min={0} style={input} value={cfg.dailyLimit} onChange={(e) => set("dailyLimit", Number(e.target.value))} />
            <p style={help}>한도를 넘으면 그날은 기본 규칙으로 처리해요. 0이면 제한 없음.</p>
          </div>
        </div>
      </Section>

      <Section title="프롬프트·안전 설정">
        <label style={label} htmlFor="rules">추가 지시문</label>
        <textarea id="rules" rows={3} style={{ ...input, resize: "vertical" }} maxLength={1000} placeholder="예: 공감 문장은 질문형으로 끝내지 말 것" value={cfg.extraRules} onChange={(e) => set("extraRules", e.target.value)} />
        <p style={help}>AI에게 보내는 기본 규칙 뒤에 덧붙여요. 최대 1,000자.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginTop: 16 }}>
          <div>
            <label style={label} htmlFor="ban">금칙어 (쉼표나 줄바꿈으로 구분)</label>
            <textarea id="ban" rows={3} style={{ ...input, resize: "vertical" }} value={cfg.bannedWords.join(", ")} onChange={(e) => set("bannedWords", e.target.value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))} />
            <p style={help}>AI 공감 문장·추천 이유에 포함되면 기본 문장으로 바꿔요.</p>
          </div>
          <div>
            <label style={label} htmlFor="cw">추가 위기 키워드</label>
            <textarea id="cw" rows={3} style={{ ...input, resize: "vertical" }} value={cfg.crisisWords.join(", ")} onChange={(e) => set("crisisWords", e.target.value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))} />
            <p style={help}>기본 위기 키워드 13종에 더해 감지해요. 감지되면 109 안내 화면이 먼저 나와요.</p>
          </div>
        </div>
      </Section>

      <Section title="설정 테스트" desc="저장하기 전 화면의 설정 그대로 실제 AI를 불러 결과를 확인해요. 사용 현황에는 기록되지 않지만 AI 요금은 발생해요.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...input, flex: "1 1 260px", width: "auto" }} maxLength={100} value={testText} onChange={(e) => setTestText(e.target.value)} />
          <button style={btn} onClick={runTest} disabled={busy || !testText.trim()}>{busy ? "실행 중…" : "테스트 실행"}</button>
        </div>
        {testOut && (
          <div style={{ marginTop: 14, background: "var(--bg)", borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}><b>처리:</b> {testOut.result.source} · {testOut.elapsedMs}ms {testOut.result.crisis && <b style={{ color: "#B0533D" }}> · 위기 감지</b>}</p>
            {testOut.meta.skippedReason === "ai_off" && <p style={{ margin: 0 }}>AI가 꺼져 있어 기본 규칙으로 처리했어요.</p>}
            {testOut.meta.attempts.map((a, i) => (
              <p key={i} style={{ margin: 0 }}>· {a.provider === "gemini" ? "Gemini" : "Claude"}: {a.ok ? "성공" : `실패 (${a.error})`} {a.ms}ms</p>
            ))}
            <p style={{ margin: "8px 0 0" }}><b>감정:</b> {testOut.result.emotions.join(", ")}</p>
            <p style={{ margin: 0 }}><b>공감:</b> {testOut.result.empathy}</p>
            <p style={{ margin: "6px 0 0" }}><b>추천 이유:</b></p>
            {Object.entries(testOut.result.reasons).slice(0, 6).map(([id, r]) => <p key={id} style={{ margin: 0 }}>· {id}: {r}</p>)}
          </div>
        )}
      </Section>

      <div style={{ position: "sticky", bottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", ...card, boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
        <button style={btn} onClick={save} disabled={busy || !dirty}>{busy ? "처리 중…" : "설정 저장"}</button>
        <button style={ghost} onClick={() => setCfg(saved)} disabled={!dirty}>되돌리기</button>
        <button style={ghost} onClick={() => setCfg({ ...defaults, updatedAt: cfg.updatedAt })}>기본값 불러오기</button>
        <span style={{ fontSize: 13.5, color: msg?.type === "err" ? "#B0533D" : "var(--muted)" }}>{msg ? msg.text : dirty ? "저장하지 않은 변경이 있어요." : ""}</span>
      </div>
    </main>
  );
}
