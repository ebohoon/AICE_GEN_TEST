/* ============================================================
 *  공유 백엔드 로직 (로컬 server.js + Vercel 서버리스 함수 공용)
 *  - 키: config.json(로컬) 우선, 없으면 환경변수(Vercel) 사용
 *  - CommonJS / Node 내장 fetch 사용
 * ============================================================ */
const fs = require("fs");
const path = require("path");

const TIMEOUT_MS = 120000; // 외부 API 호출 타임아웃

/* 기본 설정 (config.json이 없는 환경=Vercel에서는 이 값 + 환경변수 사용) */
function defaultConfig() {
  return {
    llm: {
      openai: { apiKey: "", model: "gpt-5.2", baseUrl: "https://api.openai.com/v1" },
      google: { apiKey: "", model: "gemini-2.5-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
    },
    image: {
      dalle3: { apiKey: "", model: "gpt-image-1", baseUrl: "https://api.openai.com/v1", size: "1024x1024" },
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
  // 이미지 키 미설정 시: OpenAI LLM 키(config) 또는 환경변수(OPENAI_API_KEY) 재사용
  if (provider === "dalle3") return (cfg && cfg.llm && cfg.llm.openai && cfg.llm.openai.apiKey) || process.env.OPENAI_API_KEY || "";
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

/* ---------- 헬스(키 설정 여부) ---------- */
function healthStatus() {
  const cfg = loadConfig();
  return {
    ok: true,
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

module.exports = { loadConfig, callLLM, callImage, healthStatus, readJsonBody, TIMEOUT_MS };
