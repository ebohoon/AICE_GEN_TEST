/* ============================================================
 *  연동 API 도메인 로직 (세션/토큰/결과)
 *  - Vercel 서버리스 함수(api/v1/**)와 로컬 server.js가 공용 호출
 *  - 각 handle*()는 { status, json } 을 반환 (프레임워크 비의존)
 *  - 인증: 파트너 API Key(서버-서버) / 일회용 Launch Token(HMAC 서명)
 * ============================================================ */
const crypto = require("crypto");
const db = require("./_db");

/* 현재 제공되는 문제셋(회차). 늘어나면 여기 추가 */
const AVAILABLE_SETS = [1, 2, 3];
const LAUNCH_TTL_MS = 2 * 60 * 60 * 1000;     // 진입 토큰 2시간(응시 시간 커버)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;   // 세션(미진입) 24시간

const partnerKey = () => process.env.PARTNER_API_KEY || "";
const tokenSecret = () => process.env.LAUNCH_TOKEN_SECRET || "";

function timingEq(a, b) {
  try {
    const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  } catch (e) { return false; }
}

/* 파트너 API Key 검증 (헤더 X-API-Key) */
function checkPartner(headers) {
  const h = headers || {};
  const key = h["x-api-key"] || h["X-API-Key"] || "";
  const expected = partnerKey();
  return !!expected && timingEq(key, expected);
}

/* 요청에서 공개 베이스 URL 유추 (launch_url·result_url 절대경로용) */
function baseUrlFrom(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  const h = (req && req.headers) || {};
  const proto = String(h["x-forwarded-proto"] || "https").split(",")[0];
  const host = h["x-forwarded-host"] || h["host"] || "";
  return host ? `${proto}://${host}` : "";
}

/* ---------- 일회용 Launch Token (payload {sid, exp} 를 HMAC 서명) ---------- */
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function signLaunchToken(sid, expMs) {
  const payload = b64url(JSON.stringify({ sid, exp: expMs }));
  const sig = b64url(crypto.createHmac("sha256", tokenSecret()).update(payload).digest());
  return payload + "." + sig;
}
function verifyLaunchToken(token) {
  if (!token || typeof token !== "string") return null;
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const expected = b64url(crypto.createHmac("sha256", tokenSecret()).update(p).digest());
  if (!timingEq(s, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload; // { sid, exp }
  } catch (e) { return null; }
}

const err = (status, code, message) => ({ status, json: { error: { code, message } } });

/* ---------- API ① 세션 생성 ---------- */
async function handleCreateSession(body) {
  body = body || {};
  const user_id = String(body.user_id || "").trim();
  if (!user_id) return err(400, "invalid_request", "user_id는 필수입니다.");

  let set = body.set == null || body.set === "" ? 1 : parseInt(body.set, 10);
  if (Number.isNaN(set)) set = 1;
  if (!AVAILABLE_SETS.includes(set)) {
    return err(400, "invalid_request",
      `존재하지 않는 문제셋(set=${body.set}). 현재 ${Math.min(...AVAILABLE_SETS)}~${Math.max(...AVAILABLE_SETS)}만 가능합니다.`);
  }

  const s = await db.createSession({
    set, user_id,
    course_id: body.course_id || null,
    lesson_id: body.lesson_id || null,
    external_ref: body.external_ref || null,
    callback_url: body.callback_url || null,
    return_url: body.return_url || null,
    expires_at: new Date(Date.now() + SESSION_TTL_MS),
  });
  return { status: 201, json: { session_id: s.session_id, set: s.set, status: s.status, created_at: s.created_at } };
}

/* ---------- API ② Launch Token 발급 ---------- */
async function handleLaunchToken(sessionId, baseUrl) {
  const s = await db.getSession(sessionId);
  if (!s) return err(404, "not_found", "세션을 찾을 수 없습니다.");
  if (s.status !== "created") return err(409, "already_used", "이미 진입했거나 종료된 세션입니다.");

  const expMs = Date.now() + LAUNCH_TTL_MS;
  const token = signLaunchToken(sessionId, expMs);
  const launch_url = `${baseUrl || ""}/exam?token=${token}`;
  return { status: 200, json: { session_id: sessionId, launch_url, expires_at: new Date(expMs).toISOString() } };
}

/* ---------- API ③ 결과 조회 (= result_url) ---------- */
async function handleGetResult(sessionId) {
  const s = await db.getSession(sessionId);
  if (!s) return err(404, "not_found", "세션을 찾을 수 없습니다.");
  return {
    status: 200,
    json: {
      session_id: s.session_id,
      user_id: s.user_id,
      set: s.set,
      course_id: s.course_id,
      lesson_id: s.lesson_id,
      external_ref: s.external_ref,
      status: s.status,
      started_at: s.started_at,
      submitted_at: s.submitted_at,
      answers: s.answers || [],
    },
  };
}

/* ---------- 결과 웹훅 발송 (우리 → aicoach) ---------- */
const webhookSecret = () => process.env.WEBHOOK_SECRET || "";
function signWebhook(raw) {
  return "sha256=" + crypto.createHmac("sha256", webhookSecret()).update(raw).digest("hex");
}
async function sendWebhook(session, event, baseUrl) {
  const url = session.callback_url || process.env.DEFAULT_CALLBACK_URL || "";
  if (!url) return { skipped: true };
  const body = {
    event,
    session_id: session.session_id,
    user_id: session.user_id,
    set: session.set,
    course_id: session.course_id,
    lesson_id: session.lesson_id,
    external_ref: session.external_ref,
  };
  if (event === "exam.started") body.started_at = session.started_at;
  if (event === "exam.submitted") {
    body.submitted_at = session.submitted_at;
    body.result_url = `${baseUrl || ""}/api/v1/exam-sessions/${session.session_id}`;
  }
  const raw = JSON.stringify(body);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signWebhook(raw),
        "X-Timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: raw, signal: controller.signal,
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally { clearTimeout(t); }
}

/* ---------- 시험 화면 ↔ 서버 (Launch Token 인증) ---------- */

/* 진입: 토큰 검증 → 어떤 문제셋을 로드할지 반환(상태 변경 없음) */
async function handleEnter(token) {
  const p = verifyLaunchToken(token);
  if (!p) return err(401, "unauthorized", "유효하지 않거나 만료된 토큰입니다.");
  const s = await db.getSession(p.sid);
  if (!s) return err(404, "not_found", "세션을 찾을 수 없습니다.");
  if (s.status === "submitted") return err(409, "already_submitted", "이미 제출된 세션입니다.");
  return { status: 200, json: { session_id: s.session_id, set: s.set, status: s.status } };
}

/* 시작: created→started + exam.started 웹훅(최초 1회) */
async function handleStart(token, baseUrl) {
  const p = verifyLaunchToken(token);
  if (!p) return err(401, "unauthorized", "유효하지 않거나 만료된 토큰입니다.");
  const started = await db.markStarted(p.sid);            // 전환되면 row, 아니면 null
  const cur = started || (await db.getSession(p.sid));
  if (!cur) return err(404, "not_found", "세션을 찾을 수 없습니다.");
  if (started) {                                          // 최초 시작만 웹훅
    await db.queueWebhook(cur.session_id, "exam.started");
    await sendWebhook(cur, "exam.started", baseUrl);
  }
  return { status: 200, json: { ok: true, set: cur.set, status: cur.status } };
}

/* 제출: 답안 저장 + exam.submitted 웹훅 (채점 없음, 답안 원문만) */
async function handleSubmit(token, answers, baseUrl) {
  const p = verifyLaunchToken(token);
  if (!p) return err(401, "unauthorized", "유효하지 않거나 만료된 토큰입니다.");
  if (!Array.isArray(answers)) return err(400, "invalid_request", "answers 배열이 필요합니다.");
  const s = await db.saveSubmission(p.sid, answers);
  if (!s) {
    const cur = await db.getSession(p.sid);
    if (cur && cur.status === "submitted") return err(409, "already_submitted", "이미 제출된 세션입니다.");
    return err(404, "not_found", "세션을 찾을 수 없습니다.");
  }
  await db.queueWebhook(s.session_id, "exam.submitted");
  await sendWebhook(s, "exam.submitted", baseUrl);
  return { status: 200, json: { ok: true } };
}

module.exports = {
  AVAILABLE_SETS, checkPartner, baseUrlFrom,
  signLaunchToken, verifyLaunchToken, signWebhook, sendWebhook,
  handleCreateSession, handleLaunchToken, handleGetResult,
  handleEnter, handleStart, handleSubmit,
};
