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

// Main book recommendation endpoint
app.post("/api/recommend", async (req: Request, res: Response) => {
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

  if (!text) {
    res.status(400).json({ error: "Text is required" });
    return;
  }

  const isKeywordCrisis = CRISIS_REGEX.test(text);

  const systemPrompt = `당신은 사람들의 지친 마음을 어루만져 주는 따뜻하고 섬세한 감정 책 처방사입니다.
사용자가 입력한 문장을 깊이 읽고, 느껴지는 감정을 분석하여 위로의 한마디와 추천 도서별 맞춤 이유를 작성하세요.

선택 가능한 20가지 표준 감정:
[${ALLOWED_EMOTIONS.join(", ")}]

도서 카탈로그:
${CATALOG_PROMPT_SUMMARY}

규칙:
1. emotions: 위 20가지 감정 중에서 사용자의 문장과 가장 어울리는 감정을 1~3개 선택하세요.
2. empathy: 사용자에게 건네는 따뜻하고 정중한 공감의 한 문장 (80자 이내, ~해요/~군요 어조). '우울증', '치료', '병원' 등 의학적 단어 금지.
3. reasons: 추천할 책 ID(예: "b1", "b4", "b11" 등 카탈로그에 존재하는 ID)를 키로 하고, 그 책을 추천하는 따뜻한 이유(60~80자)를 값으로 작성하세요.
4. crisis: 자해, 자살, 극단적 위험이 감지되면 true, 아니면 false.
JSON 형식으로만 응답하세요.`;

  // 1. Try Gemini if GEMINI_API_KEY is configured
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" },
          timeout: 7000,
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `사용자의 마음: "${text}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              emotions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              empathy: { type: Type.STRING },
              reasons: { type: Type.OBJECT },
              crisis: { type: Type.BOOLEAN },
            },
            required: ["emotions", "empathy", "crisis"],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      const emotions = Array.isArray(parsed.emotions)
        ? parsed.emotions.filter((e: string) => ALLOWED_EMOTIONS.includes(e)).slice(0, 3)
        : [];

      if (emotions.length > 0) {
        const cleanReasons: Record<string, string> = {};
        if (parsed.reasons && typeof parsed.reasons === "object") {
          for (const [id, reason] of Object.entries(parsed.reasons)) {
            if (BY_ID[id] && typeof reason === "string") {
              cleanReasons[id] = reason.trim().slice(0, 100);
            }
          }
        }

        const bookPool = candidates(emotions, isKeywordCrisis ? CRISIS_EXCLUDE : []);
        bookPool.slice(0, 3).forEach((id) => {
          if (!cleanReasons[id] && BY_ID[id]) {
            cleanReasons[id] = BY_ID[id].s;
          }
        });

        res.json({
          emotions,
          empathy: typeof parsed.empathy === "string" ? parsed.empathy.trim().slice(0, 120) : "",
          reasons: cleanReasons,
          crisis: Boolean(parsed.crisis) || isKeywordCrisis,
          source: "Gemini 3.8 Flash",
        });
        return;
      }
    } catch (geminiError) {
      console.warn("Gemini call failed or timed out, trying alternatives:", (geminiError as Error)?.message || geminiError);
    }
  }

  // 2. Try Claude if ANTHROPIC_API_KEY is configured
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 7000);

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `사용자의 마음: "${text}"\n반드시 순수 JSON 객체만 반환하세요: {"emotions":[], "empathy":"", "reasons":{}, "crisis":false}`,
            },
          ],
        }),
        signal: ctl.signal,
      });
      clearTimeout(timer);

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json();
        const contentText = claudeData.content?.[0]?.text || "{}";
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const emotions = Array.isArray(parsed.emotions)
            ? parsed.emotions.filter((e: string) => ALLOWED_EMOTIONS.includes(e)).slice(0, 3)
            : [];

          if (emotions.length > 0) {
            const cleanReasons: Record<string, string> = {};
            if (parsed.reasons && typeof parsed.reasons === "object") {
              for (const [id, reason] of Object.entries(parsed.reasons)) {
                if (BY_ID[id] && typeof reason === "string") {
                  cleanReasons[id] = reason.trim().slice(0, 100);
                }
              }
            }

            const bookPool = candidates(emotions, isKeywordCrisis ? CRISIS_EXCLUDE : []);
            bookPool.slice(0, 3).forEach((id) => {
              if (!cleanReasons[id] && BY_ID[id]) {
                cleanReasons[id] = BY_ID[id].s;
              }
            });

            res.json({
              emotions,
              empathy: typeof parsed.empathy === "string" ? parsed.empathy.trim().slice(0, 120) : "",
              reasons: cleanReasons,
              crisis: Boolean(parsed.crisis) || isKeywordCrisis,
              source: "Claude 3.5 Sonnet",
            });
            return;
          }
        }
      }
    } catch (claudeError) {
      console.warn("Claude call failed:", (claudeError as Error)?.message || claudeError);
    }
  }

  // 3. Robust rule-based emotional fallback
  res.json(getRuleBasedFallback(text, isKeywordCrisis));
});

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
