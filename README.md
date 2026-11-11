# Posteady Lite — 개인용 SNS 마케팅 자동화

[Posteady](https://posteady.com)의 핵심 파이프라인(수집 → 브랜드 보이스 초안 → 예약 발행 → 성과 분석)을 Threads·Instagram용으로 구현한 개인 운영 도구.

```
RSS/링크 ─(cron 6h)→ ideas ─(Claude, 브랜드 보이스)→ 초안 ─(예약)→ cron 5분 → Threads/IG 발행
                                                                 └→ cron 매일 → 인사이트 수집 → AI 리포트
```

## 1. Supabase
1. 프로젝트 생성 → SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (RLS 켜짐, service role만 접근).
2. Project Settings > API 에서 URL, `service_role` 키 복사.

## 2. Meta 토큰
- **Threads**: developers.facebook.com 앱 생성 → Threads API 사용 설정 → 권한 `threads_basic`, `threads_content_publish`, `threads_manage_insights` → 장기 토큰(60일) 발급, `THREADS_USER_ID` 확인.
- **Instagram**: 비즈니스/크리에이터 계정 + 페이스북 페이지 연결 → `instagram_content_publish`, `instagram_manage_insights` → 장기 토큰, `IG_USER_ID`. **IG는 이미지 URL(공개 접근 가능)이 필수**.
- 토큰은 약 60일마다 갱신 필요.

## 3. 환경변수 (`.env.example` 참고)
`ADMIN_TOKEN`, `CRON_SECRET`은 `openssl rand -hex 32`로 생성.

## 4. 배포 (Vercel)
1. 저장소를 Vercel에 import, 위 환경변수 등록. (Vercel은 `CRON_SECRET`을 크론 호출에 자동으로 `Authorization: Bearer`로 첨부)
2. `vercel.json`의 크론: 발행(5분), 수집(6시간), 인사이트(매일). Hobby 플랜은 크론이 하루 1회로 제한되므로 Pro 또는 외부 스케줄러 필요.
3. 접속 후 상단에 `ADMIN_TOKEN` 입력.

## 5. 사용 순서
브랜드 보이스 탭에 내 글 샘플 입력 → 소스 탭에 RSS 추가 → 아이디어에서 초안 생성(또는 작성 탭에서 주제/링크) → 수정 후 예약 → 캘린더/성과 확인.

## 로컬 실행
`cp .env.example .env.local` 후 값 채우고 `npm install && npm run dev`.

## 주의
- 개인 운영 전제의 단일 관리자 토큰 인증. 다중 사용자 서비스로 확장하려면 Supabase Auth + RLS 필요.
- 소스/링크 URL을 서버가 가져오므로 `ADMIN_TOKEN`을 유출하지 마세요.
