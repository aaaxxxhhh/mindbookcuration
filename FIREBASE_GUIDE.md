# Firebase 통계 연결 안내 (mindbookcuration)

사이트·AI 기능은 Vercel 그대로 두고, 책 반응 통계만 Firebase Firestore에 모으는 구성입니다.

## 1) 모으는 데이터
- 책별: 담기 수, 끌림(좋아요) 수, 별로예요 수 → bookStats/{책 ID}
- 감정별: 추천된 횟수 → emotionStats/{감정 이름}
- 날짜별: 추천·담기·끌림·별로 수 → dailyStats/{YYYY-MM-DD}
- 저장하지 않는 것: 입력 문장, 사용자 구분 정보, IP, 기기 정보

## 2) 바뀌는 파일
- 새 파일: api/_lib/firestore.ts, api/track.ts, api/admin/insights.ts, FIREBASE_GUIDE.md
- 수정: src/App.tsx, src/admin/AdminApp.tsx, api/admin/settings.ts, server.ts

## 3) Firebase 설정 (결제 계정 연결 없이 무료 Spark 요금제 유지)
1) https://console.firebase.google.com → 프로젝트 추가
   - Google Analytics는 꺼도 됨
   - 결제 계정(Blaze)은 연결하지 않음
2) 빌드 → Firestore Database → 데이터베이스 만들기
   - 위치: asia-northeast3 (서울) 권장, 만든 뒤 변경 불가
   - 보안 규칙: 프로덕션 모드
3) Firestore → 규칙 탭에 아래 내용 저장 (외부에서 직접 읽기·쓰기 전부 차단)
       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /{document=**} { allow read, write: if false; }
         }
       }
   - 서버(Vercel)는 서비스 계정으로 접근하므로 이 규칙과 관계없이 동작
4) 프로젝트 설정(톱니바퀴) → 서비스 계정 → 새 비공개 키 생성 → JSON 파일 다운로드
   - 이 파일은 비밀번호와 같음: GitHub에 올리지 말 것, 메신저·메일로 보내지 말 것

## 4) Vercel 설정
1) Settings → Environment Variables
   - Key: FIREBASE_SERVICE_ACCOUNT
   - Value: 다운로드한 JSON 파일 내용 전체를 그대로 붙여넣기
   - Sensitive 켜기, Production 체크
2) Deployments → 최신 배포 ⋯ → Redeploy

## 5) 확인
1) https://mindbookcuration-pi.vercel.app/admin 로그인
2) 연결 상태에 "Firebase 통계 연결됨" 표시 확인
3) 서비스 화면에서 감정 하나 선택 → 책 담기·끌림 누르기
4) 관리자 화면 "책 반응 통계 (Firebase)" → 통계 새로고침 → 숫자 반영 확인
5) Firebase 콘솔 Firestore 데이터 탭에서 bookStats, emotionStats, dailyStats 문서 확인

## 6) 참고
- 저장소(Upstash) 연결 시 같은 IP 1분 60회 초과 요청은 기록하지 않음
- Firebase 연결 전에는 수집 요청을 조용히 무시하므로 서비스 동작에는 영향 없음
- 키가 노출되면: 서비스 계정 화면에서 해당 키 삭제 → 새 키 생성 → Vercel 값 교체 → Redeploy
