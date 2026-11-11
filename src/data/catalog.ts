export interface Book {
  id: string;
  t: string;       // title
  a: string;       // author
  s: string;       // summary
  tags: string[];  // emotion tags
  genre?: string;
}

export interface Emotion {
  name: string;
  color: string;
  words: string[];
  ids: string[];
}

export interface EmotionGroup {
  name: string;
  color: string;
  emos: string[];
  line: string;
}

export const CATALOG: Book[] = [
  { id: "b1", t: "미드나잇 라이브러리", a: "매트 헤이그", s: "삶을 포기하고 싶던 주인공이 여러 갈래의 인생을 살아 보며 지금의 삶을 다시 보게 되는 이야기입니다.", tags: ["슬픔"], genre: "소설" },
  { id: "b2", t: "어린 왕자", a: "앙투안 드 생텍쥐페리", s: "짧고 따뜻한 문장으로 잃어버린 것과 소중한 것을 조용히 돌아보게 합니다.", tags: ["슬픔", "기쁨"], genre: "소설" },
  { id: "b3", t: "모순", a: "양귀자", s: "서로 다른 삶 사이에서 흔들리는 주인공을 통해 슬픔도 삶의 일부임을 보여 줍니다.", tags: ["슬픔"], genre: "소설" },
  { id: "b4", t: "죽고 싶지만 떡볶이는 먹고 싶어", a: "백세희", s: "우울한 마음을 상담 기록으로 솔직하게 풀어내, 나만 그런 게 아니라는 위로를 줍니다.", tags: ["우울"], genre: "에세이" },
  { id: "b5", t: "언어의 온도", a: "이기주", s: "일상에서 건져 올린 짧은 글들이 가라앉은 마음을 천천히 데워 줍니다.", tags: ["우울"], genre: "에세이" },
  { id: "b6", t: "우리가 빛의 속도로 갈 수 없다면", a: "김초엽", s: "멀리 떨어진 존재들의 쓸쓸함을 SF로 담담하게 그려, 무거운 마음에 조용히 곁을 내줍니다.", tags: ["우울"], genre: "SF 소설" },
  { id: "b7", t: "불안", a: "알랭 드 보통", s: "남의 시선과 지위 때문에 생기는 불안의 원인을 차분히 짚어 줍니다.", tags: ["불안"], genre: "인문" },
  { id: "b8", t: "마음챙김의 시", a: "류시화 엮음", s: "여러 시인의 시를 모아, 복잡한 생각을 잠시 내려놓고 숨 고르게 합니다.", tags: ["불안"], genre: "시" },
  { id: "b9", t: "미움받을 용기", a: "기시미 이치로·고가 후미타케", s: "남의 기대에서 벗어나 내 삶을 사는 법을 대화 형식으로 이야기합니다.", tags: ["불안", "억울함"], genre: "인문·심리" },
  { id: "b10", t: "나는 나로 살기로 했다", a: "김수현", s: "남과 비교하며 생기는 걱정 앞에서 나를 지키는 말들을 짧게 건넵니다.", tags: ["걱정"], genre: "에세이" },
  { id: "b11", t: "하마터면 열심히 살 뻔했다", a: "하완", s: "모든 걸 잘해야 한다는 걱정을 내려놓아도 괜찮다고 말해 줍니다.", tags: ["걱정", "지침"], genre: "에세이" },
  { id: "b12", t: "모모", a: "미하엘 엔데", s: "쫓기듯 사는 사람들 이야기를 통해 지금 이 순간에 머무는 법을 보여 줍니다.", tags: ["걱정", "짜증", "지침"], genre: "소설" },
  { id: "b13", t: "아주 작은 습관의 힘", a: "제임스 클리어", s: "큰일 앞에서도 할 수 있는 작은 행동 하나에 집중하게 돕습니다.", tags: ["긴장", "무기력", "뿌듯함"], genre: "자기계발" },
  { id: "b14", t: "그릿", a: "앤절라 더크워스", s: "결과보다 꾸준히 해 온 과정이 힘이 된다는 연구로 마음을 다잡게 합니다.", tags: ["긴장", "뿌듯함"], genre: "심리·자기계발" },
  { id: "b15", t: "노인과 바다", a: "어니스트 헤밍웨이", s: "거친 바다 위에서도 침착하게 버티는 노인의 모습이 조용한 용기를 줍니다.", tags: ["긴장", "무기력", "뿌듯함"], genre: "고전 소설" },
  { id: "b16", t: "데미안", a: "헤르만 헤세", s: "익숙한 세계를 깨고 나아가는 청년의 이야기로 두려움을 넘어서는 힘을 줍니다.", tags: ["두려움"], genre: "고전 소설" },
  { id: "b17", t: "연금술사", a: "파울로 코엘료", s: "두려움보다 마음의 목소리를 따라가는 여정이 한 걸음 내딛게 합니다.", tags: ["두려움", "기쁨"], genre: "소설" },
  { id: "b18", t: "자존감 수업", a: "윤홍균", s: "실패가 두려울 때 흔들리지 않는 나를 세우는 방법을 차근차근 알려 줍니다.", tags: ["두려움", "억울함"], genre: "심리" },
  { id: "b19", t: "불편한 편의점", a: "김호연", s: "동네 편의점에 모인 사람들이 서로에게 기대며 마음을 여는 따뜻한 소설입니다.", tags: ["외로움"], genre: "소설" },
  { id: "b20", t: "어서 오세요, 휴남동 서점입니다", a: "황보름", s: "작은 동네 서점에 모인 사람들이 느슨하게 연결되며 위로를 나눕니다.", tags: ["외로움", "지침"], genre: "소설" },
  { id: "b21", t: "스토너", a: "존 윌리엄스", s: "조용하고 외로운 한 사람의 일생을 담담하게 따라가며 깊은 공감을 줍니다.", tags: ["외로움"], genre: "소설" },
  { id: "b22", t: "달러구트 꿈 백화점", a: "이미예", s: "꿈을 사고파는 상상 속 백화점에서 비어 있던 마음이 조금씩 채워지는 이야기입니다.", tags: ["공허함"], genre: "판타지 소설" },
  { id: "b23", t: "지구 끝의 온실", a: "김초엽", s: "무너진 세상에서도 서로를 돌보는 사람들을 통해 삶의 의미를 다시 찾게 합니다.", tags: ["공허함"], genre: "SF 소설" },
  { id: "b24", t: "월든", a: "헨리 데이비드 소로", s: "숲속의 단순한 생활 기록이 정말 필요한 것이 무엇인지 돌아보게 합니다.", tags: ["공허함", "짜증", "무기력", "행복"], genre: "고전 에세이" },
  { id: "b25", t: "화", a: "틱낫한", s: "화를 억누르지 않고 알아차리고 다루는 방법을 쉬운 말로 알려 줍니다.", tags: ["분노"], genre: "명상·심리" },
  { id: "b26", t: "감정은 습관이다", a: "박용철", s: "자꾸 반복되는 화가 어디서 오는지, 어떻게 바꿀 수 있는지 설명합니다.", tags: ["분노", "짜증"], genre: "심리" },
  { id: "b27", t: "당신이 옳다", a: "정혜신", s: "분노 밑에 있는 진짜 마음을 먼저 알아봐 주라고 말합니다.", tags: ["분노", "억울함"], genre: "심리" },
  { id: "b28", t: "사랑의 기술", a: "에리히 프롬", s: "사랑을 감정이 아닌 배우고 연습하는 능력으로 바라보게 합니다.", tags: ["사랑"], genre: "인문" },
  { id: "b29", t: "왜 나는 너를 사랑하는가", a: "알랭 드 보통", s: "사랑에 빠지는 순간의 생각과 감정을 섬세하게 따라갑니다.", tags: ["사랑"], genre: "소설" },
  { id: "b30", t: "위대한 개츠비", a: "F. 스콧 피츠제럴드", s: "한 사람을 향한 강렬한 마음이 어디까지 갈 수 있는지 보여 줍니다.", tags: ["사랑"], genre: "고전 소설" },
  { id: "b31", "t": "너의 췌장을 먹고 싶어", a: "스미노 요루", s: "서로 다른 두 학생이 가까워지는 과정을 풋풋하게 그린 소설입니다.", tags: ["설렘"], genre: "소설" },
  { id: "b32", t: "오만과 편견", a: "제인 오스틴", s: "오해를 넘어 서로를 알아 가는 두 사람의 이야기가 설렘을 더해 줍니다.", tags: ["설렘"], genre: "고전 소설" },
  { id: "b33", t: "냉정과 열정 사이", a: "에쿠니 가오리·쓰지 히토나리", s: "두 작가가 남녀의 시선을 나눠 쓴, 오래 이어지는 사랑 이야기입니다.", tags: ["설렘"], genre: "소설" },
  { id: "b34", t: "빨강 머리 앤", a: "루시 모드 몽고메리", s: "작은 일에도 크게 기뻐하는 앤의 상상력이 지금의 즐거움을 더 키워 줍니다.", tags: ["기쁨"], genre: "고전 소설" },
  { id: "b35", t: "꾸뻬 씨의 행복 여행", a: "프랑수아 를로르", s: "정신과 의사가 세계를 여행하며 행복의 조건을 하나씩 적어 가는 이야기입니다.", tags: ["행복"], genre: "소설" },
  { id: "b36", t: "행복의 기원", a: "서은국", s: "행복이 왜 생기는지 심리학 연구로 설명해, 지금의 행복을 더 잘 이해하게 합니다.", tags: ["행복"], genre: "심리" },
  { id: "b37", t: "나미야 잡화점의 기적", a: "히가시노 게이고", s: "시간을 건너 이어지는 편지가 지나간 인연을 따뜻하게 되돌아보게 합니다.", tags: ["그리움"], genre: "소설" },
  { id: "b38", t: "엄마를 부탁해", a: "신경숙", s: "사라진 엄마를 찾으며 가족이 서로를 다시 기억하는 이야기입니다.", tags: ["그리움"], genre: "소설" },
  { id: "b39", t: "연을 쫓는 아이", a: "할레드 호세이니", s: "어린 시절 친구를 향한 그리움과 미안함을 따라가는 이야기입니다.", tags: ["그리움"], genre: "소설" },
  { id: "b40", t: "숨결이 바람 될 때", a: "폴 칼라니티", s: "삶의 끝을 마주한 의사의 기록으로, 떠난 사람과 남은 시간을 생각하게 합니다.", tags: ["상실감"], genre: "에세이" },
  { id: "b41", t: "모리와 함께한 화요일", a: "미치 앨봄", s: "옛 스승과 매주 나눈 대화를 통해 떠나보냄과 남겨진 것을 이야기합니다.", tags: ["상실감"], genre: "에세이" },
  { id: "b42", t: "작별하지 않는다", a: "한강", s: "잊히지 않는 사람과 기억을 끝까지 붙드는 마음을 깊게 그린 소설입니다.", tags: ["상실감"], genre: "소설" }
];

export const EMOS: Emotion[] = [
  { name: "슬픔", color: "#4A6FA5", words: ["슬픔", "슬퍼", "슬프", "눈물", "울고", "울었", "울어", "서글"], ids: ["b1", "b2", "b3"] },
  { name: "우울", color: "#556B8D", words: ["우울", "울적", "가라앉", "침울"], ids: ["b4", "b5", "b6"] },
  { name: "불안", color: "#7A6A9E", words: ["불안"], ids: ["b7", "b8", "b9"] },
  { name: "걱정", color: "#6F7FA0", words: ["걱정", "염려", "신경 쓰", "신경쓰"], ids: ["b10", "b11", "b12"] },
  { name: "긴장", color: "#8A6F8F", words: ["긴장", "초조", "떨려", "떨리", "조마"], ids: ["b13", "b14", "b15"] },
  { name: "두려움", color: "#5F5A86", words: ["두려", "무서", "무섭", "겁"], ids: ["b16", "b17", "b18"] },
  { name: "외로움", color: "#3E7C7A", words: ["외로", "외롭", "고독", "혼자", "쓸쓸"], ids: ["b19", "b20", "b21"] },
  { name: "공허함", color: "#4F7F86", words: ["공허", "허전", "허무", "텅 빈", "텅빈"], ids: ["b22", "b23", "b24"] },
  { name: "분노", color: "#A0523D", words: ["분노", "화나", "화가", "화난", "화남", "열받", "빡치", "분해", "분하"], ids: ["b25", "b26", "b27"] },
  { name: "짜증", color: "#9A6A3E", words: ["짜증", "예민", "거슬"], ids: ["b26", "b12", "b24"] },
  { name: "억울함", color: "#8C5A5A", words: ["억울", "서운", "섭섭", "속상"], ids: ["b27", "b18", "b9"] },
  { name: "무기력", color: "#6B7A5A", words: ["무기력", "의욕", "귀찮", "아무것도"], ids: ["b13", "b15", "b24"] },
  { name: "지침", color: "#7C8461", words: ["지쳐", "지친", "지침", "지치", "피곤", "번아웃", "힘들", "힘드", "힘듦", "지쳤", "힘들었", "녹초"], ids: ["b11", "b20", "b12"] },
  { name: "사랑", color: "#A64D6E", words: ["사랑", "연애", "좋아하", "썸"], ids: ["b28", "b29", "b30"] },
  { name: "설렘", color: "#B05A7A", words: ["설렘", "설레", "두근", "기대돼", "기대된", "기대되"], ids: ["b31", "b32", "b33"] },
  { name: "기쁨", color: "#B0822E", words: ["기쁨", "기뻐", "기쁘", "신나", "신남", "즐거", "즐겁"], ids: ["b34", "b17", "b2"] },
  { name: "행복", color: "#A08A3A", words: ["행복", "만족", "평온", "편안", "좋아", "좋다", "좋은"], ids: ["b35", "b36", "b24"] },
  { name: "뿌듯함", color: "#8E7A2E", words: ["뿌듯", "자랑스", "성취", "해냈"], ids: ["b14", "b13", "b15"] },
  { name: "그리움", color: "#5A6E8C", words: ["그리움", "그리워", "그립", "보고싶", "보고 싶", "추억"], ids: ["b37", "b38", "b39"] },
  { name: "상실감", color: "#4D5E78", words: ["상실", "이별", "헤어", "잃었", "잃어", "떠나보"], ids: ["b40", "b41", "b42"] }
];

export const GROUPS: EmotionGroup[] = [
  { name: "가라앉는 마음", color: "#4A6FA5", emos: ["슬픔", "우울", "공허함"], line: "마음이 무겁게 가라앉은 날이네요. 천천히 읽을 수 있는 책을 골랐어요." },
  { name: "불안한 마음", color: "#7A6A9E", emos: ["불안", "걱정", "긴장", "두려움"], line: "마음이 자꾸 앞서가는 것 같아요. 숨 고르기에 좋은 책을 골랐어요." },
  { name: "날 선 마음", color: "#B0533D", emos: ["분노", "짜증", "억울함"], line: "속에서 뭔가 끓어오르는 하루였군요. 그 마음을 들여다볼 책을 골랐어요." },
  { name: "지친 마음", color: "#55744F", emos: ["무기력", "지침", "외로움"], line: "많이 지쳤나 봐요. 잠시 쉬어 가도 괜찮다고 말해 줄 책을 골랐어요." },
  { name: "밝은 마음", color: "#94661A", emos: ["기쁨", "행복", "뿌듯함", "설렘", "사랑"], line: "좋은 기운이 느껴져요. 그 마음을 더 오래 품을 책을 골랐어요." },
  { name: "그리운 마음", color: "#8C5A7A", emos: ["그리움", "상실감"], line: "누군가, 무언가가 많이 생각나는 날이네요. 곁에 둘 만한 책을 골랐어요." }
];

export const BY_ID = Object.fromEntries(CATALOG.map(b => [b.id, b])) as Record<string, Book>;
export const EMO_BY_NAME = Object.fromEntries(EMOS.map(e => [e.name, e])) as Record<string, Emotion>;
export const EMO_ORDER = Object.fromEntries(EMOS.map((e, i) => [e.name, i])) as Record<string, number>;

export const GROUP_OF: Record<string, EmotionGroup> = {};
GROUPS.forEach(g => g.emos.forEach(n => { GROUP_OF[n] = g; }));

export function emoFor(b: Book, emoNames: string[]): string {
  return b.tags.find(t => emoNames.includes(t)) ||
         b.tags.find(t => emoNames.some(n => GROUP_OF[n] === GROUP_OF[t])) ||
         emoNames[0] ||
         b.tags[0];
}

export function colorOf(n?: string): string {
  if (!n) return "#2F5D62";
  return (GROUP_OF[n] || {}).color || "#2F5D62";
}

export const CRISIS_REGEX = /(죽고\s*싶|죽을\s*래|죽어\s*버리|자살|자해|사라지고\s*싶|없어지고\s*싶|살기\s*싫|살고\s*싶지\s*않|끝내고\s*싶|극단적|목숨|뛰어내리)/;
export const CRISIS_EXCLUDE = CATALOG.filter(b => /죽고\s*싶/.test(b.t)).map(b => b.id);

export function candidates(names: string[], exclude?: string[]): string[] {
  const score = (b: Book) => b.tags.filter(t => names.includes(t)).length;
  const sorted = [...names].sort((a, b) => (EMO_ORDER[a] ?? 99) - (EMO_ORDER[b] ?? 99));
  const out: string[] = [];
  
  // 1) 두 감정 이상에 겹치는 책
  CATALOG.filter(b => score(b) > 1).sort((a, b) => score(b) - score(a)).forEach(b => out.push(b.id));
  
  // 2) 감정 순서대로 각 감정의 대표 책 1권씩
  for (let r = 0; r < 3; r++) {
    sorted.forEach(n => {
      const emoObj = EMO_BY_NAME[n];
      const id = emoObj?.ids[r];
      if (id && !out.includes(id)) out.push(id);
    });
  }
  
  // 3) 같은 감정 태그가 붙은 나머지 책
  CATALOG.filter(b => score(b) > 0 && !out.includes(b.id)).forEach(b => out.push(b.id));
  
  // 4) 같은 감정 묶음의 다른 감정 책
  const groupEmos = [...new Set(sorted.flatMap(n => (GROUP_OF[n]?.emos || [])))].filter(n => !names.includes(n));
  groupEmos.forEach(n => {
    EMO_BY_NAME[n]?.ids.forEach(id => {
      if (!out.includes(id)) out.push(id);
    });
  });
  
  const res = out.filter(id => !(exclude || []).includes(id));
  const sens = CATALOG.filter(b => /죽고\s*싶/.test(b.t)).map(b => b.id);
  if (res.length > 1 && sens.includes(res[0])) {
    const s = res.shift()!;
    res.splice(2, 0, s);
  }
  return res;
}

const EXCLUDE = ["썸네일", "썸머", "썸바디", "좋아요", "화가가그린", "화가의", "화가는"];
function negated(s: string, i: number, len: number): boolean {
  const before = s.slice(Math.max(0, i - 1), i);
  const after = s.slice(i + len, i + len + 4);
  return before === "안" || before === "못" || /^.{0,2}지(않|못|마)/.test(after);
}

export function findEmotions(input: string): Emotion[] {
  let s = input.replace(/\s+/g, "");
  EXCLUDE.forEach(x => { s = s.split(x).join("#".repeat(x.length)); });
  const hits: { e: Emotion; pos: number }[] = [];
  
  EMOS.forEach(e => {
    let pos = -1;
    e.words.forEach(w => {
      const k = w.replace(/\s+/g, "");
      let from = 0;
      let i: number;
      while ((i = s.indexOf(k, from)) >= 0) {
        if (k === "화가" && !/^(나|났|치밀|난)/.test(s.slice(i + 2, i + 4))) {
          from = i + 1;
          continue;
        }
        if (!negated(s, i, k.length)) {
          if (pos < 0 || i < pos) pos = i;
          break;
        }
        from = i + 1;
      }
    });
    if (pos >= 0) hits.push({ e, pos });
  });
  
  return hits.sort((a, b) => a.pos - b.pos).map(h => h.e);
}

export function storeLink(b: Book): string {
  const q = encodeURIComponent(b.t + " " + b.a.split("·")[0].replace(" 엮음", ""));
  return `https://search.kyobobook.co.kr/search?keyword=${q}`;
}
