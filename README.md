# 감정 책 추천 v0.7 배포판 (Claude API 연동)

v0.5.3 화면에 Claude API를 연결한 버전입니다.

## 1) 폴더 구성
1) index.html : 화면 (v0.5.3 디자인 그대로)
2) api/recommend.js : 입력 문장을 Claude API로 보내 감정·추천 이유·공감 문장·위기 여부를 받아 오는 중간 서버
3) api/cover.js : 알라딘에서 책 표지를 찾아오는 중간 서버 (선택)
4) api/_data.js : 감정 20개·도서 42권 목록 (서버용)
5) package.json, .env.example, .gitignore : 실행 설정

## 2) 준비물
1) Anthropic API 키 (필수)
   - https://console.anthropic.com 에서 결제 수단 등록 후 API Keys 메뉴에서 발급
   - 사용한 만큼 요금이 나갑니다
2) 알라딘 TTBKey (선택, 실제 표지를 쓰려면)
   - https://www.aladin.co.kr/ttb/apiguide.aspx 에서 발급
3) GitHub 계정, Vercel 계정 (무료 플랜 가능)

## 3) 배포 순서 (Vercel)
1) 이 폴더를 GitHub 새 저장소에 올림 (공개 여부 상관없음)
2) https://vercel.com 로그인 → Add New → Project → 저장소 선택
3) Framework Preset은 Other 그대로 → Deploy
4) Project → Settings → Environment Variables 에 등록
   - ANTHROPIC_API_KEY = Anthropic API 키 (필수)
   - ALADIN_TTB_KEY = 알라딘 TTBKey (선택)
   - CLAUDE_MODEL = 사용할 모델 이름 (선택, 기본값 claude-haiku-5-5)
   - ALLOWED_ORIGIN = 배포된 주소 예: https://내프로젝트.vercel.app (선택, 다른 사이트에서 내 API를 쓰지 못하게 막음)
5) Deployments → 최신 배포 → Redeploy (환경변수 반영)
6) 발급된 주소로 접속해 문장 입력 → 결과 확인

## 4) 작동 방식
1) 화면에서 문장 입력 → /api/recommend 가 Claude에게 감정·추천 이유·공감 문장·위기 여부를 물어봄
2) 책 3권은 화면 쪽 코드 규칙으로 고름 (같은 감정이면 항상 같은 책)
3) 15초 안에 답이 없거나 오류가 나면 단어 찾기 방식으로 자동 전환
4) /api/cover 가 알라딘 표지를 찾으면 실제 표지, 못 찾으면 디자인 표지 그대로

## 5) 지켜야 할 점
1) API 키는 절대 코드나 GitHub에 올리지 말고 Vercel 환경변수로만 등록
2) 입력 문장은 서버에 저장하지 않음 (화면 고지 문구와 일치하도록 로그 기록 코드를 추가하지 말 것)
3) 같은 IP에서 1분 20회 요청 제한이 있으나 서버 인스턴스별로 따로 세어 완벽하지 않음
   → 공개 배포 시 Anthropic 콘솔에서 월 사용 한도(Spend limit) 설정 권장
4) 알라딘 OpenAPI 하루 호출 한도 5,000회, 표지 결과는 하루 동안 저장해 재사용
