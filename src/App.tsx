/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  CATALOG,
  EMOS,
  GROUPS,
  GROUP_OF,
  BY_ID,
  findEmotions,
  candidates,
  emoFor,
  colorOf,
  storeLink,
  CRISIS_REGEX,
  CRISIS_EXCLUDE,
  Book,
} from "./data/catalog.ts";
import { Bookmark, ExternalLink, RefreshCw, Share2, ThumbsUp, ThumbsDown, ArrowLeft, PhoneCall, Sparkles } from "lucide-react";

// 책 저장·반응·추천 감정을 이름 없는 통계로 보냄 (실패해도 화면에는 영향 없음)
const track = (event: Record<string, unknown>) => {
  try {
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event), keepalive: true }).catch(() => {});
  } catch {
    // ignore
  }
};

export default function App() {
  const [view, setView] = useState<"ask" | "wait" | "result" | "saved" | "crisis">("ask");
  const [input, setInput] = useState("");
  const [dominantEmos, setDominantEmos] = useState<string[]>([]);
  const [activeBookIdx, setActiveBookIdx] = useState(0);
  const [shelfIds, setShelfIds] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [empathy, setEmpathy] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [isCrisis, setIsCrisis] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedBackView, setSavedBackView] = useState<"ask" | "result">("ask");
  const [covers, setCovers] = useState<Record<string, { cover?: string | null; link?: string | null }>>({});

  // Local storage for saved books and user feedback
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("mb_saved");
      return stored ? JSON.parse(stored).filter((id: string) => BY_ID[id]) : [];
    } catch {
      return [];
    }
  });

  const [feedback, setFeedback] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("mb_feedback");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toastTimer = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const toggleSave = (id: string) => {
    const isCurrentlySaved = saved.includes(id);
    const updated = isCurrentlySaved ? saved.filter((x) => x !== id) : [id, ...saved];
    setSaved(updated);
    track({ type: isCurrentlySaved ? "unsave" : "save", bookId: id });
    try {
      localStorage.setItem("mb_saved", JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast(isCurrentlySaved ? "담은 책에서 뺐어요" : "읽고 싶은 책에 담았어요");
  };

  const handleFeedback = (id: string, val: number) => {
    const currentVal = feedback[id] || 0;
    const nextVal = currentVal === val ? 0 : val;
    const updated = { ...feedback, [id]: nextVal };
    setFeedback(updated);
    track({ type: "feedback", bookId: id, from: currentVal, to: nextVal });
    try {
      localStorage.setItem("mb_feedback", JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (nextVal === 1) showToast("끌린다고 남겼어요");
    else if (nextVal === -1) showToast("다음 추천에서는 뒤로 미룰게요");
    else showToast("반응을 지웠어요");
  };

  // Update theme background tint
  useEffect(() => {
    const root = document.documentElement;
    if (view === "result" && dominantEmos.length > 0) {
      const c = colorOf(dominantEmos[0]);
      root.style.setProperty("--mood", c);
      root.style.setProperty("--tint", "12%");
    } else {
      root.style.setProperty("--tint", "0%");
    }
  }, [view, dominantEmos]);

  // Fetch book cover if available
  useEffect(() => {
    shelfIds.forEach((id) => {
      if (!covers[id] && BY_ID[id]) {
        const b = BY_ID[id];
        fetch(`/api/cover?title=${encodeURIComponent(b.t)}&author=${encodeURIComponent(b.a)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && (data.cover || data.link)) {
              setCovers((prev) => ({ ...prev, [id]: data }));
            }
          })
          .catch(() => {});
      }
    });
  }, [shelfIds, covers]);

  const runRecommendation = async (textToAnalyze: string) => {
    const query = textToAnalyze.trim();
    if (!query) return;

    const hasCrisisKeyword = CRISIS_REGEX.test(query);

    if (hasCrisisKeyword) {
      setInput(query);
      setIsCrisis(true);
      setView("crisis");
      return;
    }

    setView("wait");
    setNote(null);
    setShareOpen(false);

    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 15000);

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query }),
        signal: ctl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error("API response error");

      const data = await res.json();
      if (data.crisis) {
        setInput(query);
        setIsCrisis(true);
        setView("crisis");
        return;
      }

      applyRecommendationData(query, data);
    } catch {
      // Graceful fallback to rule-based analysis
      const matched = findEmotions(query).slice(0, 3);
      const names = matched.length ? matched.map((m) => m.name) : ["우울"];
      const fbEmpathy = (GROUP_OF[names[0]]?.line) || "마음이 무겁게 가라앉은 날이네요. 천천히 읽을 수 있는 책을 골랐어요.";
      applyRecommendationData(query, {
        emotions: names,
        empathy: fbEmpathy,
        reasons: {},
        crisis: false,
        source: "fallback",
      });
      setNote("AI 연결 상태가 원활하지 않아 준비된 기본 규칙으로 골랐어요.");
    }
  };

  const applyRecommendationData = (
    query: string,
    data: { emotions: string[]; empathy: string; reasons?: Record<string, string>; crisis?: boolean; source?: string }
  ) => {
    const rawEmos = Array.isArray(data.emotions) ? data.emotions : [];
    const validEmos = rawEmos.filter((e) => EMOS.some((item) => item.name === e)).slice(0, 3);
    const chosenEmos = validEmos.length > 0 ? validEmos : ["우울"];

    const fullCandidates = candidates(chosenEmos, data.crisis ? CRISIS_EXCLUDE : []);
    // Reorder based on user feedback
    const ordered = [
      ...fullCandidates.filter((id) => (feedback[id] || 0) !== -1),
      ...fullCandidates.filter((id) => (feedback[id] || 0) === -1),
    ];

    setInput(query);
    setDominantEmos(chosenEmos);
    if (!data.crisis) track({ type: "recommend", emotions: chosenEmos });
    setPool(ordered);
    setPage(0);
    setShelfIds(ordered.slice(0, 3));
    setActiveBookIdx(0);
    setReasons(data.reasons || {});
    setEmpathy(data.empathy || GROUP_OF[chosenEmos[0]]?.line || "");
    setIsCrisis(Boolean(data.crisis));
    if (data.source) {
      setNote(`${data.source} 분석 기반 맞춤 도서 처방`);
    }
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextBooks = () => {
    if (pool.length <= 3) return;
    const totalPages = Math.ceil(pool.length / 3);
    const nextPage = (page + 1) % totalPages;
    let nextIds = pool.slice(nextPage * 3, nextPage * 3 + 3);
    for (let i = 0; nextIds.length < 3 && i < pool.length; i++) {
      if (!nextIds.includes(pool[i])) nextIds.push(pool[i]);
    }
    setPage(nextPage);
    setShelfIds(nextIds);
    setActiveBookIdx(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeBook = shelfIds.length > 0 ? BY_ID[shelfIds[activeBookIdx]] : null;
  const activeBookEmo = activeBook && dominantEmos.length > 0 ? emoFor(activeBook, dominantEmos) : dominantEmos[0];
  const activeBookColor = colorOf(activeBookEmo);
  const activeReason =
    activeBook && (reasons[activeBook.id] || activeBook.s);

  const shareText = `‘${input}’ 마음에 추천받은 책: ` + shelfIds.map((id) => BY_ID[id]?.t).filter(Boolean).join(", ");
  const shareUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showToast("링크를 복사했어요");
    } catch {
      showToast("복사할 수 없는 브라우저 환경입니다");
    }
  };

  return (
    <div className="min-h-screen text-[var(--ink)] flex flex-col justify-between">
      <main className="w-full max-w-[760px] mx-auto px-5 pt-8 pb-16 flex-1">
{/* ================= STEP 1: ASK VIEW ================= */}
        {view === "ask" && (
          <section className="animate-slide-up">
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => {
                  setSavedBackView("ask");
                  setView("saved");
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] rounded-full px-3.5 py-1.5 hover:border-[var(--ink)] transition-colors shadow-xs"
              >
                <Bookmark className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>읽고 싶은 책</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs">
                  {saved.length}
                </span>
              </button>
            </div>

            <h1 className="font-serif-kr font-bold text-4xl sm:text-5xl leading-tight tracking-tight mt-3 mb-3 text-[var(--ink)]">
              지금 기분이
              <br />
              어때요?
            </h1>
            <p className="text-[var(--muted)] text-base sm:text-lg mb-7">
              느끼는 그대로 적으면, 그 마음에 꼭 맞는 책 3권을 골라 드려요.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runRecommendation(input);
              }}
              className="flex flex-wrap sm:flex-nowrap gap-2.5 mb-2"
            >
              <input
                id="mood-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: 요즘 너무 지쳐서 아무것도 손에 안 잡혀"
                maxLength={100}
                className="flex-1 min-w-[240px] text-base sm:text-lg px-4 py-3.5 rounded-xl border-1.5 border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 shadow-xs transition-all"
              />
              <button
                type="submit"
                className="w-full sm:w-auto font-bold text-base px-6 py-3.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-95 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>내 마음에 맞는 책 보기</span>
              </button>
            </form>

            <p className="text-xs text-[var(--muted)] mb-8">
              입력한 문장은 감정 분석을 위해 AI로 전달되며 저장되지 않아요. 책 담기·반응은 누구인지 알 수 없는 통계로만 모아요.
            </p>

            <div className="pt-2">
              <p className="text-sm font-medium text-[var(--muted)] mb-3">또는 지금 감정을 골라 보세요</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {GROUPS.map((group) => (
                  <div
                    key={group.name}
                    className="bg-[var(--surface)] rounded-2xl p-3.5 border-t-[5px] shadow-xs"
                    style={{ borderTopColor: group.color }}
                  >
                    <h2 className="font-serif-kr text-sm font-bold text-[var(--ink)] mb-2.5">{group.name}</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {group.emos.map((emoName) => (
                        <button
                          key={emoName}
                          type="button"
                          onClick={() => {
                            setInput(emoName);
                            runRecommendation(emoName);
                          }}
                          className="text-xs px-2.5 py-1 rounded-full border border-black/10 hover:border-transparent hover:text-white transition-all cursor-pointer font-medium"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${group.color} 12%, var(--surface))`,
                            color: "var(--ink)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = group.color;
                            e.currentTarget.style.color = "#FFFFFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${group.color} 12%, var(--surface))`;
                            e.currentTarget.style.color = "var(--ink)";
                          }}
                        >
                          {emoName}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================= STEP 2: WAIT VIEW ================= */}
        {view === "wait" && (
          <section className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-slide-up">
            <div className="flex items-end gap-1.5 h-[90px] border-b-[6px] border-[var(--shelf)] px-3 mb-6">
              <i className="block w-[22px] h-[62px] rounded-t-xs bg-[#4A6FA5] animate-bob-1" />
              <i className="block w-[22px] h-[78px] rounded-t-xs bg-[#94661A] animate-bob-2" />
              <i className="block w-[22px] h-[54px] rounded-t-xs bg-[#7A6A9E] animate-bob-3" />
              <i className="block w-[22px] h-[70px] rounded-t-xs bg-[#5E8A7E] animate-bob-4" />
            </div>
            <p className="font-serif-kr text-xl sm:text-2xl font-bold text-[var(--ink)] mb-1.5">
              마음을 읽고 책을 고르는 중이에요…
            </p>
            <small className="text-sm text-[var(--muted)]">Gemini AI가 따뜻한 한마디와 추천 책을 준비하고 있어요</small>
          </section>
        )}

        {/* ================= STEP 3: RESULT VIEW ================= */}
        {view === "result" && (
          <section className="animate-slide-up">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-[var(--muted)] text-sm sm:text-base truncate max-w-full">
                <span className="font-medium text-[var(--ink)]">‘{input}’</span>에 맞춘 오늘의 마음 처방
              </p>
              <button
                type="button"
                onClick={() => {
                  setSavedBackView("result");
                  setView("saved");
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] rounded-full px-3 py-1 hover:border-[var(--ink)] transition-colors shadow-xs ml-auto"
              >
                <Bookmark className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>읽고 싶은 책</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs">
                  {saved.length}
                </span>
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {dominantEmos.map((emo) => (
                <span
                  key={emo}
                  className="px-3 py-0.5 rounded-full text-white text-xs sm:text-sm font-medium shadow-xs"
                  style={{ backgroundColor: colorOf(emo) }}
                >
                  #{emo}
                </span>
              ))}
            </div>

            {/* Crisis Alert if crisisMode */}
            {isCrisis && (
              <div className="bg-[var(--surface)] border-l-4 border-[#B0533D] rounded-xl p-3.5 mb-5 text-sm text-[var(--ink)]">
                힘든 마음이 계속되면 혼자 견디지 말고 자살예방상담전화{" "}
                <a href="tel:109" className="font-bold underline text-[#B0533D]">
                  109
                </a>
                (24시간, 무료)에 이야기해 보세요.
              </div>
            )}

            {/* Empathy Message */}
            <p
              className="text-base sm:text-lg pl-3.5 py-1 mb-6 leading-relaxed font-serif-kr"
              style={{ borderLeft: `3px solid ${colorOf(dominantEmos[0])}` }}
            >
              {empathy}
            </p>

            {/* 3D Physical Bookshelf */}
            <div
              className="grid grid-cols-3 gap-2.5 sm:gap-5 items-end px-2 sm:px-6 max-w-[540px] mx-auto border-b-[10px] border-[var(--shelf)] rounded-b-xs"
              role="group"
              aria-label="추천 책 3권"
            >
              {shelfIds.map((id, idx) => {
                const book = BY_ID[id];
                if (!book) return null;
                const bookEmo = emoFor(book, dominantEmos);
                const baseColor = colorOf(bookEmo);
                const shades = ["0%", "18%", "32%"];
                const coverInfo = covers[id];
                const isSelected = activeBookIdx === idx;
                const isBookSaved = saved.includes(id);

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveBookIdx(idx)}
                    className={`relative w-full aspect-[2/3] p-2.5 sm:p-3.5 rounded-r-lg rounded-l-xs text-white text-left flex flex-col justify-between overflow-hidden transition-all duration-200 cursor-pointer pat${idx} ${
                      isSelected
                        ? "-translate-y-3.5 shadow-[inset_7px_0_0_rgba(0,0,0,0.25),0_16px_26px_rgba(0,0,0,0.28)]"
                        : "hover:-translate-y-1 shadow-[inset_7px_0_0_rgba(0,0,0,0.22),0_6px_14px_rgba(0,0,0,0.18)]"
                    }`}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${baseColor}, #1a1a1a ${shades[idx]})`,
                    }}
                  >
                    {/* Real Cover Image if present */}
                    {coverInfo?.cover && (
                      <img
                        src={coverInfo.cover}
                        alt={book.t}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {/* Bookmark badge */}
                    {isBookSaved && (
                      <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-bold bg-white/95 text-[#1E2A33] px-1.5 py-0.2 rounded-full shadow-xs">
                        담음
                      </span>
                    )}

                    {/* Physical Cover Typography (hidden if real cover is loaded) */}
                    {!coverInfo?.cover && (
                      <>
                        <span className="text-[10px] sm:text-xs opacity-85">{bookEmo}</span>
                        <span className="font-serif-kr font-bold text-xs sm:text-sm leading-tight line-clamp-3">
                          {book.t}
                        </span>
                        <span className="text-[10px] sm:text-xs opacity-85 border-t border-white/40 pt-1 truncate">
                          {book.a}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs text-[var(--muted)] mt-2.5 mb-5">
              책을 눌러 고른 이유를 확인해 보세요
            </p>

            {/* Selected Book Detail Card */}
            {activeBook && (
              <article
                className="bg-[var(--surface)] rounded-2xl p-5 sm:p-6 border-t-[6px] shadow-sm mb-6 transition-all"
                style={{ borderTopColor: activeBookColor }}
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <h2 className="font-serif-kr text-xl sm:text-2xl font-bold text-[var(--ink)]">
                    {activeBook.t}
                  </h2>
                  <span className="text-xs sm:text-sm text-[var(--muted)]">
                    {activeBook.a} {activeBook.genre && `· ${activeBook.genre}`}
                  </span>
                </div>

                <p className="text-xs font-bold text-[var(--muted)] mt-3 mb-1">이 책을 고른 이유</p>
                <p className="text-base sm:text-lg font-medium text-[var(--ink)] leading-relaxed mb-3">
                  {activeReason}
                </p>

                {activeReason !== activeBook.s && (
                  <p className="text-sm text-[var(--muted)] mb-4">{activeBook.s}</p>
                )}

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleSave(activeBook.id)}
                    className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      saved.includes(activeBook.id)
                        ? "bg-transparent text-[var(--accent)] border-1.5 border-[var(--accent)]"
                        : "bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-95"
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{saved.includes(activeBook.id) ? "담은 책이에요" : "읽고 싶은 책에 담기"}</span>
                  </button>

                  <a
                    href={covers[activeBook.id]?.link || storeLink(activeBook)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[170px] inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-bold text-sm text-[var(--ink)] border-1.5 border-[var(--line)] hover:border-[var(--ink)] bg-transparent transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>온라인 서점에 구매하러 가기</span>
                  </a>
                </div>

                {/* Feedback rating */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--line)]/50">
                  <span className="text-xs text-[var(--muted)] mr-1">이 추천 어때요?</span>
                  <button
                    type="button"
                    onClick={() => handleFeedback(activeBook.id, 1)}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                      feedback[activeBook.id] === 1
                        ? "border-[var(--ink)] text-[var(--ink)] font-bold bg-black/5"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)]"
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>끌려요</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(activeBook.id, -1)}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                      feedback[activeBook.id] === -1
                        ? "border-[var(--ink)] text-[var(--ink)] font-bold bg-black/5"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)]"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span>별로예요</span>
                  </button>
                </div>
              </article>
            )}

            {/* Bottom Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              {pool.length > 3 && (
                <button
                  type="button"
                  onClick={nextBooks}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-bold text-sm text-[var(--ink)] border-1.5 border-[var(--line)] hover:border-[var(--ink)] bg-transparent cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>다른 책 보기</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setInput("");
                  setView("ask");
                }}
                className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-bold text-sm text-[var(--ink)] border-1.5 border-[var(--line)] hover:border-[var(--ink)] bg-transparent cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>다른 기분으로 다시 찾기</span>
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(!shareOpen)}
                className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-bold text-sm text-[var(--ink)] border-1.5 border-[var(--line)] hover:border-[var(--ink)] bg-transparent cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>결과 공유하기</span>
              </button>
            </div>

            {/* Share Panel */}
            {shareOpen && (
              <div className="flex flex-wrap gap-2 p-3.5 bg-[var(--surface)] rounded-xl border border-[var(--line)] mb-4 animate-slide-up">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border border-[var(--line)] hover:border-[var(--ink)] bg-[var(--bg)]"
                >
                  X (트위터)
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border border-[var(--line)] hover:border-[var(--ink)] bg-[var(--bg)]"
                >
                  페이스북
                </a>
                <a
                  href={`https://share.naver.com/web/shareView.nhn?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border border-[var(--line)] hover:border-[var(--ink)] bg-[var(--bg)]"
                >
                  네이버 블로그
                </a>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border border-[var(--line)] hover:border-[var(--ink)] bg-[var(--bg)] cursor-pointer"
                >
                  링크 복사
                </button>
              </div>
            )}

            {note && <p className="text-xs text-[var(--muted)] text-center mt-3">{note}</p>}
          </section>
        )}

        {/* ================= STEP 4: SAVED BOOKS VIEW ================= */}
        {view === "saved" && (
          <section className="animate-slide-up">
            <h2 className="font-serif-kr text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
              <span>읽고 싶은 책</span>
              <span className="text-base px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-sans">
                {saved.length}
              </span>
            </h2>

            {saved.length === 0 ? (
              <div className="bg-[var(--surface)] rounded-2xl p-8 border-1.5 border-dashed border-[var(--line)] text-center my-6">
                <p className="font-medium text-base mb-1">아직 담은 책이 없어요.</p>
                <p className="text-sm text-[var(--muted)]">추천 결과에서 마음에 드는 책을 담아 보세요.</p>
              </div>
            ) : (
              <ul className="grid gap-3 mb-6">
                {saved.map((id) => {
                  const book = BY_ID[id];
                  if (!book) return null;
                  const bookColor = colorOf(book.tags[0]);

                  return (
                    <li
                      key={id}
                      className="flex gap-3.5 bg-[var(--surface)] rounded-xl p-3.5 shadow-xs border border-[var(--line)]/50 items-center"
                    >
                      {/* Tiny Cover */}
                      <div
                        className="w-12 h-16 shrink-0 rounded-xs flex flex-col justify-between p-1.5 text-white shadow-xs"
                        style={{ backgroundColor: bookColor }}
                      >
                        <span className="font-serif-kr text-[9px] font-bold leading-tight line-clamp-2">
                          {book.t}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <strong className="block text-base font-serif-kr truncate">{book.t}</strong>
                        <p className="text-xs text-[var(--muted)] mb-2 truncate">
                          {book.a} {book.genre && `· ${book.genre}`}
                        </p>
                        <div className="flex items-center gap-3">
                          <a
                            href={storeLink(book)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--ink)] underline underline-offset-2 hover:opacity-80"
                          >
                            온라인 서점에 구매하러 가기
                          </a>
                          <button
                            type="button"
                            onClick={() => toggleSave(id)}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            빼기
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-xs text-[var(--muted)] mb-6">담은 책은 이 브라우저에만 저장돼요.</p>

            <button
              type="button"
              onClick={() => {
                if (savedBackView === "result" && shelfIds.length > 0) {
                  setView("result");
                } else {
                  setView("ask");
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-3 px-6 rounded-xl font-bold text-sm bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{savedBackView === "result" ? "추천 결과로 돌아가기" : "처음으로"}</span>
            </button>
          </section>
        )}

        {/* ================= CRISIS VIEW ================= */}
        {view === "crisis" && (
          <section className="bg-[var(--surface)] rounded-2xl p-6 sm:p-8 border-t-[5px] border-[#B0533D] shadow-sm animate-slide-up">
            <p className="text-sm text-[var(--muted)] mb-1">‘{input}’</p>
            <h2 className="font-serif-kr text-2xl sm:text-3xl font-bold mb-3 text-[#B0533D]">
              지금 많이 힘드신 것 같아요.
            </h2>
            <p className="text-base text-[var(--ink)] leading-relaxed mb-5">
              혼자 견디지 않아도 괜찮아요. 지금 바로 이야기를 들어 줄 사람이 있어요.
            </p>

            <a
              href="tel:109"
              className="inline-flex items-center gap-2 text-white bg-[#B0533D] hover:bg-[#964330] px-5 py-3.5 rounded-xl font-bold text-base transition-colors shadow-sm mb-2"
            >
              <PhoneCall className="w-5 h-5" />
              <span>자살예방상담전화 109에 전화하기</span>
            </a>
            <p className="text-xs text-[var(--muted)] mb-7">24시간 언제든 무료로 상담받을 수 있어요.</p>

            <div className="flex flex-wrap gap-2.5 pt-3 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => {
                  applyRecommendationData(input, {
                    emotions: ["우울"],
                    empathy: "지금 마음이 많이 무거우신 것 같아요. 조용히 곁을 지켜 줄 책을 골랐어요.",
                    reasons: {},
                    crisis: true,
                  });
                }}
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--line)] hover:border-[var(--ink)] text-[var(--ink)] cursor-pointer"
              >
                그래도 책 보기
              </button>
              <button
                type="button"
                onClick={() => {
                  setInput("");
                  setView("ask");
                }}
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--line)] hover:border-[var(--ink)] text-[var(--ink)] cursor-pointer"
              >
                처음으로
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 rounded-full text-sm shadow-lg pointer-events-none z-50 animate-slide-up">
          {toastMessage}
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-[760px] mx-auto px-5 py-6 text-center text-xs text-[var(--muted)] border-t border-[var(--line)]/50">
        v0.7 · AI(Gemini 3.8 Flash)가 입력한 문장 속 감정을 읽고, 42권의 엄선된 도서 안에서 3권을 골라 드려요.
        <br />
        도서 표지 및 상품 정보 제공:{" "}
        <a
          href="https://www.aladin.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--ink)]"
        >
          알라딘
        </a>
      </footer>
    </div>
  );
}
