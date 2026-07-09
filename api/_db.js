/* ============================================================
 *  DB 접근 계층 (Postgres · 표준 pg 드라이버 · 일반 TCP)
 *  - 연동 API(세션 생성/진입/제출/결과/웹훅)에서 공용 사용
 *  - 접속 문자열: POSTGRES_URL (Vercel Postgres/Neon 자동 주입) 등
 *  - 호출마다 Client 연결/해제 (저볼륨 서버리스에 충분)
 * ============================================================ */
const crypto = require("crypto");
const { Client } = require("pg");

const VALID_STATUS = ["created", "started", "submitted", "expired"];

function newSessionId() {
  return "sess_" + crypto.randomBytes(9).toString("hex");
}

/* 접속 문자열 선택 (환경마다 변수명이 다를 수 있어 폴백) */
function connString() {
  return process.env.POSTGRES_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || process.env.DATABASE_URL
    || process.env.DATABASE_URL_UNPOOLED
    || "";
}

/* 호출마다 Client 연결/해제. Neon 등은 SSL 필수(로컬은 예외) */
async function withClient(run) {
  const cs = connString();
  const isLocal = /localhost|127\.0\.0\.1/.test(cs);
  const client = new Client({ connectionString: cs, ssl: isLocal ? false : { rejectUnauthorized: false } });
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
    await c.query(
      `insert into exam_session
         (session_id, set_no, user_id, course_id, lesson_id, external_ref, callback_url, return_url, expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, d.set || 1, d.user_id, d.course_id || null, d.lesson_id || null,
       d.external_ref || null, d.callback_url || null, d.return_url || null, d.expires_at || null]
    );
    const { rows } = await c.query(`select * from exam_session where session_id = $1`, [id]);
    return toSession(rows[0]);
  });
}

/* 세션 조회 (API ③ 결과 조회 / 내부용) */
async function getSession(id) {
  return withClient(async (c) => {
    const { rows } = await c.query(`select * from exam_session where session_id = $1`, [id]);
    return toSession(rows[0]);
  });
}

/* 일회용 진입 토큰 소모 — 미사용 & 만료 전이면 성공(정상 진입), 아니면 null */
async function consumeLaunch(id) {
  return withClient(async (c) => {
    const { rows } = await c.query(
      `update exam_session
          set launch_used_at = now()
        where session_id = $1
          and launch_used_at is null
          and status = 'created'
          and (expires_at is null or expires_at > now())
      returning *`, [id]);
    return toSession(rows[0]);
  });
}

/* 응시 시작 처리 (exam.started 시점) */
async function markStarted(id) {
  return withClient(async (c) => {
    const { rows } = await c.query(
      `update exam_session
          set status = 'started', started_at = coalesce(started_at, now())
        where session_id = $1 and status in ('created')
      returning *`, [id]);
    return toSession(rows[0]);
  });
}

/* 제출 저장 (answers = 응시자 답안 원문, 채점 없음) */
async function saveSubmission(id, answers) {
  return withClient(async (c) => {
    const { rows } = await c.query(
      `update exam_session
          set status = 'submitted', submitted_at = now(), answers = $2::jsonb
        where session_id = $1 and status <> 'submitted'
      returning *`, [id, JSON.stringify(answers)]);
    return toSession(rows[0]);
  });
}

/* 만료 처리(선택: 크론에서 미사용 세션 정리) */
async function expireStale() {
  return withClient(async (c) => {
    const r = await c.query(
      `update exam_session set status = 'expired'
        where status = 'created' and expires_at is not null and expires_at < now()`);
    return r.rowCount;
  });
}

/* ---------- 웹훅 발송 큐 (Phase 5에서 사용) ---------- */
async function queueWebhook(sessionId, event) {
  return withClient(async (c) => {
    await c.query(
      `insert into webhook_delivery (session_id, event) values ($1,$2)
       on conflict (session_id, event) do nothing`, [sessionId, event]);
  });
}

module.exports = {
  newSessionId, createSession, getSession, consumeLaunch,
  markStarted, saveSubmission, expireStale, queueWebhook,
  VALID_STATUS, toSession,
};
