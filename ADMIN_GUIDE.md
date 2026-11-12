# 관리자 페이지 설치 안내 (mindbookcuration)

## 1) 바뀌는 파일
- 새 파일: api/_lib/store.ts, config.ts, stats.ts, auth.ts, engine.ts
- 새 파일: api/admin/login.ts, logout.ts, settings.ts, test.ts
- 새 파일: src/admin/AdminApp.tsx
- 수정: api/recommend.ts, src/main.tsx, server.ts

## 2) Vercel 설정
1) Storage(또는 Marketplace) → Upstash for Redis → 데이터베이스 만들기 → 이 프로젝트에 연결
   - KV_REST_API_URL, KV_REST_API_TOKEN (또는 UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)이 자동 등록됨
2) Settings → Environment Variables 에 추가
   - ADMIN_PASSWORD = 관리자 비밀번호 (12자 이상 권장)
   - ADMIN_SESSION_SECRET = 아무 긴 임의 문자열 (선택, 없으면 비밀번호로 서명)
3) Redeploy

## 3) 접속
- https://mindbookcuration-pi.vercel.app/admin

## 4) 관리 항목
- AI 켜기/끄기, AI 사용 순서(Gemini·Claude), 모델 이름, 응답 제한 시간(2~7초), 하루 AI 호출 한도
- 추가 지시문, 금칙어, 추가 위기 키워드
- 오늘·최근 7일 사용 현황 (입력 문장은 저장하지 않음)
- 저장 전 설정 테스트
