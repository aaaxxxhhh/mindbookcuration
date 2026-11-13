import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import {
  CATALOG,
  EMOS,
  GROUP_OF,
  findEmotions,
  candidates,
  CRISIS_REGEX,
  CRISIS_EXCLUDE,
  BY_ID,
} from "./src/data/catalog.ts";

import recommendHandler from "./api/recommend.ts";
import adminLogin from "./api/admin/login.ts";
import adminLogout from "./api/admin/logout.ts";
import adminSettings from "./api/admin/settings.ts";
import adminTest from "./api/admin/test.ts";
import trackHandler from "./api/track.ts";
import adminInsights from "./api/admin/insights.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";

app.use(express.json());

const ALLOWED_EMOTIONS = EMOS.map((e) => e.name);

// Catalog summary for LLM prompt
const CATALOG_PROMPT_SUMMARY = CATALOG.map(
  (b) => `ID: ${b.id} | 제목: ${b.t} | 저자: ${b.a} | 장르: ${b.genre || "일반"} | 태그: [${b.tags.join(", ")}] | 줄거리: ${b.s}`
).join("\n");

// Rule-based fallback generator
function getRuleBasedFallback(text: string, isCrisis: boolean) {
  const matched = findEmotions(text).slice(0, 3);
  const names = matched.length ? matched.map((m) => m.name) : ["우울"];
  const candidateIds = candidates(names, isCrisis ? CRISIS_EXCLUDE : []);
  const topIds = candidateIds.slice(0, 3);
  const dominantEmo = names[0];
  const group = GROUP_OF[dominantEmo];
  const empathy =
    group?.line || "마음이 많이 무거우신 것 같아요. 천천히 곁에 둘 만한 책을 골랐어요.";

  const reasons: Record<string, string> = {};
  topIds.forEach((id) => {
    const book = BY_ID[id];
    if (book) {
      reasons[id] = book.s;
    }
  });

  return {
    emotions: names,
    empathy,
    reasons,
    crisis: isCrisis,
    source: "기본 감정 분석 엔진",
  };
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    hasClaudeKey: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

// Download endpoint for user to download entire project zip
app.get("/project.zip", (_req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), "public/project.zip");
  res.download(filePath, "book-recommend-project.zip");
});

// Book cover proxy endpoint
app.get("/api/cover", async (req: Request, res: Response) => {
  const title = String(req.query.title || "");
  const author = String(req.query.author || "");
  const ttbKey = process.env.ALADIN_TTB_KEY;

  if (!ttbKey || !title) {
    res.json({ cover: null, link: null });
    return;
  }

  try {
    const cleanTitle = title.trim();
    const cleanAuthor = author.split("·")[0].replace(" 엮음", "").trim();
    const query = encodeURIComponent(`${cleanTitle} ${cleanAuthor}`);
    const url = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${query}&QueryType=Keyword&MaxResults=1&start=1&SearchTarget=Book&output=js&Version=20131101`;

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const fetchRes = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);

    if (fetchRes.ok) {
      const data = await fetchRes.json();
      const item = data.item?.[0];
      if (item) {
        res.json({ cover: item.cover || null, link: item.link || null });
        return;
      }
    }
  } catch {
    // Ignore and fallback gracefully
  }

  res.json({ cover: null, link: null });
});

// Main book recommendation endpoint (Vercel과 같은 코드 사용)
app.post("/api/recommend", (req: Request, res: Response) => recommendHandler(req, res));

// 관리자 API (Vercel과 같은 코드 사용)
app.post("/api/admin/login", (req: Request, res: Response) => adminLogin(req, res));
app.post("/api/admin/logout", (req: Request, res: Response) => adminLogout(req, res));
app.all("/api/admin/settings", (req: Request, res: Response) => adminSettings(req, res));
app.post("/api/admin/test", (req: Request, res: Response) => adminTest(req, res));
app.post("/api/track", (req: Request, res: Response) => trackHandler(req, res));
app.get("/api/admin/insights", (req: Request, res: Response) => adminInsights(req, res));

// Setup Vite middleware in dev or static server in prod
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
