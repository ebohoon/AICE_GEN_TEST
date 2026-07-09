/* ============================================================
 *  DB 접근 계층 (Postgres · Vercel Postgres/Neon)
 *  - 연동 API(세션 생성/진입/제출/결과/웹훅)에서 공용 사용
 *  - 접속 문자열은 환경변수 POSTGRES_URL (Vercel Postgres 자동 주입)
 *  - createClient() 사용: direct(비풀링) 연결 문자열과 호환
 *    (sql/createPool 은 pooled 문자열을 요구해 direct URL에서 오류)
 * ============================================================ */
const crypto = require("crypto");
const { createClient } = require("@vercel/postgres");

const VALID_STATUS = ["created", "started", "submitted", "expired"];

function newSessionId() {
  return "sess_" + crypto.randomBytes(9).toString("hex");
}

/* 호출마다 클라이언트 연결/해제 (POSTGRES_URL = direct 연결) */
async function withClient(run) {
  const client = createClient(); // 기본으로 process.env.POSTGRES_URL 사용
  await client.connect();
  try {
    return await run(client);
  } finally {
    try { await client.end(); } catch (e) { /* 무시 */ }
  }
}

/* DB row → API 응답용 세션 객체(명세 필드명으로 정규화) */
function toSession(row) {
  if (!row) return null;
  return {
    session_id: row.session_id,
    set: row.set_no,
    user_id: row.user_id,
    course_id: row.course_id || null,
    lesson_id: row.lesson_id || null,
    external_ref: row.external_ref || null,
    callback_url: row.callback_url || null,
    return_url: row.return_url || null,
    status: row.status,
    answers: row.answers || null,
    created_at: row.created_at,
    started_at: row.started_at || null,
    submitted_at: row.submitted_at || null,
    expires_at: row.expires_at || null,
  };
}

/* 세션 생성 (API ① 세션 생성) */
async function createSession(d) {
  const id = newSessionId();
  return withClient(async (c) => {
    await c.sql`
      insert into exam_session
        (session_id, set_no, user_id, course_id, lesson_id, external_ref, callback_url, return_url, expires_at)
      values
        (${id}, ${d.set || 1}, ${d.user_id}, ${d.course_id || null}, ${d.lesson_id || null},
         ${d.external_ref || null}, ${d.callback_url || null}, ${d.return_url || null}, ${d.expires_at || null})
    `;
    const { rows } = await c.sql`select * from exam_session where session_id = ${id}`;
    return toSession(rows[0]);
  });
}

/* 세션 조회 (API ③ 결과 조회 / 내부용) */
async function getSession(id) {
  return withClient(async (c) => {
    const { rows } = await c.sql`select * from exam_session where session_id = ${id}`;
    return toSession(rows[0]);
  });
}

/* 일회용 진입 토큰 소모 — 미사용 & 만료 전이면 성공(정상 진입), 아니면 null */
async function consumeLaunch(id) {
  return withClient(async (c) => {
    const { rows } = await c.sql`
      update exam_session
         set launch_used_at = now()
       where session_id = ${id}
         and launch_used_at is null
         and status = 'created'
         and (expires_at is null or expires_at > now())
      returning *
    `;
    return toSession(rows[0]);
  });
}

/* 응시 시작 처리 (exam.started 시점) */
async function markStarted(id) {
  return withClient(async (c) => {
    const { rows } = await c.sql`
      update exam_session
         set status = 'started', started_at = coalesce(started_at, now())
       where session_id = ${id} and status in ('created')
      returning *
    `;
    return toSession(rows[0]);
  });
}

/* 제출 저장 (answers = 응시자 답안 원문, 채점 없음) */
async function saveSubmission(id, answers) {
  return withClient(async (c) => {
    const { rows } = await c.sql`
      update exam_session
         set status = 'submitted', submitted_at = now(), answers = ${JSON.stringify(answers)}::jsonb
       where session_id = ${id} and status <> 'submitted'
      returning *
    `;
    return toSession(rows[0]);
  });
}

/* 만료 처리(선택: 크론에서 미사용 세션 정리) */
async function expireStale() {
  return withClient(async (c) => {
    const { rowCount } = await c.sql`
      update exam_session set status = 'expired'
       where status = 'created' and expires_at is not null and expires_at < now()
    `;
    return rowCount;
  });
}

/* ---------- 웹훅 발송 큐 (Phase 5에서 사용) ---------- */
async function queueWebhook(sessionId, event) {
  return withClient(async (c) => {
    await c.sql`
      insert into webhook_delivery (session_id, event)
      values (${sessionId}, ${event})
      on conflict (session_id, event) do nothing
    `;
  });
}

module.exports = {
  newSessionId, createSession, getSession, consumeLaunch,
  markStarted, saveSubmission, expireStale, queueWebhook,
  VALID_STATUS, toSession,
};
