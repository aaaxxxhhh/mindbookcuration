export default async function handler(req: any, res: any) {
  const title = String(req.query?.title || "");
  const author = String(req.query?.author || "");
  const ttbKey = process.env.ALADIN_TTB_KEY;

  if (!ttbKey || !title) {
    res.status(200).json({ cover: null, link: null });
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
        res.status(200).json({ cover: item.cover || null, link: item.link || null });
        return;
      }
    }
  } catch {
    // Ignore and fallback gracefully
  }

  res.status(200).json({ cover: null, link: null });
}
