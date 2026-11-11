// 알라딘 OpenAPI로 책 표지 주소를 찾아 돌려주는 중간 서버
// 필요 환경변수: ALADIN_TTB_KEY
export default async function handler(req, res) {
  const key = process.env.ALADIN_TTB_KEY;
  const title = String(req.query.title || "").slice(0, 100);
  const author = String(req.query.author || "").slice(0, 60);
  if (!key) return res.status(500).json({ error: "ALADIN_TTB_KEY 없음" });
  if (!title) return res.status(400).json({ error: "title 필요" });

  const url = "http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?" + new URLSearchParams({
    ttbkey: key, Query: title, QueryType: "Title", MaxResults: "10", start: "1",
    SearchTarget: "Book", output: "js", Version: "20131101", Cover: "Big"
  });
  try {
    const raw = await (await fetch(url)).text();
    // 알라딘 응답에 섞일 수 있는 잘못된 따옴표 표기를 정리한 뒤 해석
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1).replace(/\\'/g, "'"));
    const items = Array.isArray(json.item) ? json.item : [];
    const firstAuthor = author.split(/[·,\s]/).filter(Boolean)[0] || "";
    const clean = s => String(s || "").replace(/\s+/g, "");
    const pick =
      items.find(i => clean(i.title).startsWith(clean(title)) && (!firstAuthor || String(i.author).includes(firstAuthor))) ||
      items.find(i => !firstAuthor || String(i.author).includes(firstAuthor)) ||
      null;
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    if (!pick || !pick.cover) return res.status(200).json({ cover: null, link: null });
    return res.status(200).json({
      cover: String(pick.cover).replace(/^http:\/\//, "https://"),
      link: pick.link || null
    });
  } catch (e) {
    return res.status(502).json({ error: "알라딘 응답 오류" });
  }
}
