/* ============================================================
 *  공유 백엔드 로직 (로컬 server.js + Vercel 서버리스 함수 공용)
 *  - 키: config.json(로컬) 우선, 없으면 환경변수(Vercel) 사용
 *  - CommonJS / Node 내장 fetch 사용
 * ============================================================ */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TIMEOUT_MS = 150000; // 외부 API 호출 타임아웃 (Nano Banana 이미지 생성이 ~70초+라 여유 확보)

/* 기본 설정 (config.json이 없는 환경=Vercel에서는 이 값 + 환경변수 사용) */
function defaultConfig() {
  return {
    llm: {
      openai: { apiKey: "", model: "gpt-5.4-mini", baseUrl: "https://api.openai.com/v1" },
      google: { apiKey: "", model: "gemini-2.5-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
    },
    image: {
      dalle3: { apiKey: "", model: "gpt-image-1", baseUrl: "https://api.openai.com/v1", size: "1024x1024" },
      nanobanana: { apiKey: "", model: "gemini-2.5-flash-image", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
    },
  };
}

/* config.json이 있으면(로컬) 병합, 없으면(Vercel) 기본값 그대로 → 키는 환경변수로 */
function loadConfig() {
  const cfg = defaultConfig();
  try {
    const p = path.join(__dirname, "..", "config.json");
    if (fs.existsSync(p)) {
      const file = JSON.parse(fs.readFileSync(p, "utf8"));
      for (const grp of ["llm", "image"]) {
        if (file[grp]) {
          for (const k of Object.keys(file[grp])) {
            cfg[grp][k] = Object.assign({}, cfg[grp][k], file[grp][k]);
          }
        }
      }
      if (file.auth) cfg.auth = file.auth; // 로컬 비밀번호 설정(선택)
    }
  } catch (e) { /* 무시하고 기본값+환경변수 사용 */ }
  return cfg;
}

/* 키 결정: config 우선, 없으면 환경변수 */
function llmKey(provider, c) {
  if (c && c.apiKey) return c.apiKey;
  if (provider === "openai") return process.env.OPENAI_API_KEY || "";
  if (provider === "google") return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  return "";
}
function imageKey(provider, c, cfg) {
  if (c && c.apiKey) return c.apiKey;
  // 이미지 키 미설정 시: 동일 벤더 LLM 키(config) 또는 환경변수 재사용
  if (provider === "dalle3") return (cfg && cfg.llm && cfg.llm.openai && cfg.llm.openai.apiKey) || process.env.OPENAI_API_KEY || "";
  if (provider === "nanobanana") return (cfg && cfg.llm && cfg.llm.google && cfg.llm.google.apiKey) || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  return "";
}

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

/* fetch + 타임아웃 + 일시 오류(5xx/네트워크) 자동 재시도 */
async function fetchJSON(url, options, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, { ...options, signal: controller.signal });
      const text = await r.text();
      clearTimeout(t);
      if (r.status >= 500 && attempt < retries) {
        lastErr = new Error(`서버 오류 ${r.status}`);
        await sleep(700 * (attempt + 1));
        continue;
      }
      let json = null;
      if (text) { try { json = JSON.parse(text); } catch (_) { json = null; } }
      return { ok: r.ok, status: r.status, json, text };
    } catch (e) {
      clearTimeout(t);
      if (e.name === "AbortError") throw new Error("외부 API 응답 시간 초과");
      lastErr = e;
      if (attempt < retries) { await sleep(700 * (attempt + 1)); continue; }
      throw lastErr;
    }
  }
  throw lastErr;
}

function apiError(label, status, json, text) {
  const fromJson = json && json.error && (json.error.message || (typeof json.error === "string" ? json.error : null));
  const msg = fromJson || (text ? text.replace(/\s+/g, " ").trim().slice(0, 200) : "") || `HTTP ${status}`;
  return new Error(`${label} 오류 (${status}): ${msg}`);
}

/* ---------- LLM 텍스트 ---------- */
async function callLLM(provider, prompt, cfg) {
  const c = cfg.llm && cfg.llm[provider];
  if (!c) throw new Error(`알 수 없는 LLM 모델: ${provider}`);
  const key = llmKey(provider, c);
  if (!key) throw new Error(`${provider} API 키가 설정되지 않았습니다. (Vercel 환경변수 또는 config.json 확인)`);

  if (provider === "google") {
    const base = c.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    const url = `${base}/models/${c.model}:generateContent`;
    const { ok, status, json, text } = await fetchJSON(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!ok) throw apiError("Google API", status, json, text);
    const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
    const textOut = parts.map((p) => p.text || "").join("");
    const um = json.usageMetadata || {};
    return { provider, model: c.model, text: textOut, usage: { prompt: um.promptTokenCount || 0, completion: um.candidatesTokenCount || 0, total: um.totalTokenCount || 0 } };
  }

  const base = c.baseUrl || "https://api.openai.com/v1";
  const url = `${base}/chat/completions`;
  const { ok, status, json, text } = await fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: c.model, messages: [{ role: "user", content: prompt }] }),
  });
  if (!ok) throw apiError(provider, status, json, text);
  const textOut = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || "";
  const u = json.usage || {};
  return { provider, model: c.model, text: textOut, usage: { prompt: u.prompt_tokens || 0, completion: u.completion_tokens || 0, total: u.total_tokens || 0 } };
}

/* ---------- 이미지 (OpenAI gpt-image) ---------- */
async function callImage(provider, prompt, cfg) {
  const c = (cfg.image && cfg.image[provider]) || {};
  const key = imageKey(provider, c, cfg);
  if (!key) throw new Error(`${provider} 이미지 API 키가 설정되지 않았습니다. (Vercel 환경변수 또는 config.json 확인)`);

  // Google Nano Banana (gemini-2.5-flash-image) — Gemini generateContent로 이미지 생성
  if (provider === "nanobanana") {
    const gbase = c.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    const gmodel = c.model || "gemini-2.5-flash-image";
    const url = `${gbase}/models/${gmodel}:generateContent`;
    const { ok, status, json, text } = await fetchJSON(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
    });
    if (!ok) throw apiError("Nano Banana 이미지 API", status, json, text);
    const cand = (json.candidates && json.candidates[0]) || {};
    const parts = (cand.content && cand.content.parts) || [];
    const images = parts
      .filter((p) => p.inlineData && p.inlineData.data)
      .map((p) => ({ b64: p.inlineData.data, mime: p.inlineData.mimeType || "image/png" }));
    if (!images.length) {
      // 이미지가 안 온 이유(안전차단/모델 텍스트 응답 등)를 그대로 노출해 진단 가능하게 함
      const note = parts.map((p) => p.text).filter(Boolean).join(" ").trim().slice(0, 200);
      const reason = cand.finishReason || (json.promptFeedback && json.promptFeedback.blockReason) || "";
      throw new Error(`이미지가 생성되지 않았습니다.${reason ? ` (사유: ${reason})` : ""}${note ? ` 모델 응답: ${note}` : ""}`);
    }
    return { provider, model: gmodel, images };
  }

  const base = c.baseUrl || "https://api.openai.com/v1";
  const model = c.model || "gpt-image-1";
  const url = `${base}/images/generations`;
  const payload = { model, prompt, n: 1 };
  if (c.size) payload.size = c.size;

  const { ok, status, json, text } = await fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!ok) throw apiError("이미지 API", status, json, text);
  const data = json.data || [];
  const images = data.map((it) => (it.b64_json ? { b64: it.b64_json, mime: "image/png" } : { url: it.url }));
  if (!images.length) throw new Error("이미지 결과가 비어 있습니다.");
  return { provider, model, images };
}

/* ============================================================
 *  인증 (공용 비밀번호 1개 — 서버 측 강제)
 *  - 비밀번호: config.json auth.password(로컬) 또는 환경변수 ACCESS_PASSWORD
 *  - 비밀번호 미설정 시 인증 비활성(공개 접근) → 점진적 적용 가능
 *  - 토큰: 비밀번호를 키로 한 HMAC 서명 (별도 시크릿 불필요)
 * ============================================================ */
function getAccessPassword() {
  const cfg = loadConfig();
  return (cfg.auth && cfg.auth.password) || process.env.ACCESS_PASSWORD || "";
}
function authRequired() { return !!getAccessPassword(); }

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function makeToken(ttlMs) {
  const pw = getAccessPassword();
  const payload = b64url(JSON.stringify({ exp: Date.now() + (ttlMs || 12 * 60 * 60 * 1000) }));
  const sig = b64url(crypto.createHmac("sha256", pw).update(payload).digest());
  return payload + "." + sig;
}
/* HMAC 서명 토큰 공통 검증 (payload.exp 만료 포함) */
function verifySigned(token, key) {
  if (!key || !token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = b64url(crypto.createHmac("sha256", key).update(parts[0]).digest());
  const a = Buffer.from(parts[1]); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (!payload.exp || Date.now() > payload.exp) return false;
  } catch (e) { return false; }
  return true;
}
function verifyToken(token) { return verifySigned(token, getAccessPassword()); }
/* 비밀번호 일치 확인 (타이밍 안전) */
function checkPassword(input) {
  const pw = getAccessPassword();
  if (!pw) return false;
  const h = (s) => crypto.createHash("sha256").update(String(s || "")).digest();
  try { return crypto.timingSafeEqual(h(input), h(pw)); } catch (e) { return false; }
}
/* 요청에서 Bearer 토큰 추출 후 검증 (인증 비활성 시 항상 통과)
 * - 표준 모드: 입장코드 로그인 토큰(ACCESS_PASSWORD 서명)
 * - aicoach 연동(SSO) 모드: Launch Token(LAUNCH_TOKEN_SECRET 서명)도 허용
 *   → 통합 모드는 로그인 없이 진입하므로 LLM/이미지 API를 진입 토큰으로 인증 */
function isAuthorized(req) {
  if (!authRequired()) return true;
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  const token = h.replace(/^Bearer\s+/i, "");
  if (verifySigned(token, getAccessPassword())) return true;
  return verifySigned(token, process.env.LAUNCH_TOKEN_SECRET || "");
}

/* ---------- 헬스(키/인증 설정 여부) ---------- */
function healthStatus() {
  const cfg = loadConfig();
  return {
    ok: true,
    authRequired: authRequired(),
    keys: {
      openai: !!llmKey("openai", cfg.llm.openai),
      google: !!llmKey("google", cfg.llm.google),
      img_dalle3: !!imageKey("dalle3", cfg.image.dalle3, cfg),
    },
  };
}

/* 요청 본문 파싱 (Vercel: req.body 자동 파싱 / 폴백: 스트림 읽기) */
async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) { return {}; } }
    return req.body;
  }
  return await new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 20e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch (_) { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

module.exports = {
  loadConfig, callLLM, callImage, healthStatus, readJsonBody, TIMEOUT_MS,
  authRequired, makeToken, verifyToken, checkPassword, isAuthorized,
};
