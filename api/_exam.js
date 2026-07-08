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
const LAUNCH_TTL_MS = 15 * 60 * 1000;         // 진입 토큰 15분
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

module.exports = {
  AVAILABLE_SETS, checkPartner, baseUrlFrom,
  signLaunchToken, verifyLaunchToken,
  handleCreateSession, handleLaunchToken, handleGetResult,
};
