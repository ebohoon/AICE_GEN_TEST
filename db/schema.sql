-- ============================================================
--  AICE GENERATIVE 모의고사 ↔ aicoach.kr 연동 스키마
--  Postgres (Vercel Postgres / Neon)
--  적용: Vercel 대시보드 Storage > (DB) > Query 에 붙여넣어 실행
--        또는  npm run migrate  (POSTGRES_URL 필요)
-- ============================================================

-- 응시 세션: 세션 생성 → 진입(started) → 제출(submitted) 전 과정을 보관
create table if not exists exam_session (
  session_id     text primary key,                 -- 예: sess_ab12cd34ef
  set_no         integer not null default 1,       -- 문제셋(회차) 1~3. 'set'은 예약어라 set_no
  user_id        text not null,                    -- aicoach 사용자 ID (이름/이메일 미저장)
  course_id      text,                             -- 과정 식별자(과정 연계)
  lesson_id      text,                             -- 차시 식별자(과정 연계)
  external_ref   text,                             -- aicoach 임의 참조값(결과에 echo)
  callback_url   text,                             -- 결과 웹훅 수신 URL(미지정 시 기본 URL 사용)
  return_url     text,                             -- 응시 종료 후 팝업 이동/닫힘 URL
  status         text not null default 'created',  -- created | started | submitted | expired
  answers        jsonb,                            -- 제출된 응시자 답안(채점 없음, 원문만)
  launch_used_at timestamptz,                      -- 일회용 진입 토큰 사용 시각(재사용 차단)
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  submitted_at   timestamptz,
  expires_at     timestamptz                       -- 진입 토큰/세션 만료 기준
);

create index if not exists idx_exam_session_user   on exam_session (user_id);
create index if not exists idx_exam_session_course on exam_session (course_id);
create index if not exists idx_exam_session_status on exam_session (status);

-- 결과 웹훅 발송 큐/로그: 재시도(지수 백오프)·멱등 처리에 사용 (Phase 5)
create table if not exists webhook_delivery (
  id            bigserial primary key,
  session_id    text not null references exam_session (session_id),
  event         text not null,                     -- exam.started | exam.submitted
  status        text not null default 'pending',   -- pending | delivered | failed
  attempts      integer not null default 0,
  last_error    text,
  next_retry_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz,
  unique (session_id, event)                        -- 멱등: 세션×이벤트 1건
);

create index if not exists idx_webhook_pending on webhook_delivery (status, next_retry_at);
