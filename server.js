/* ============================================================
 *  AICE GENERATIVE 모의고사 - 백엔드 서버 (의존성 없음, Node 내장 모듈만)
 *
 *  역할:
 *   1) 정적 파일(index.html 등) 제공
 *   2) /api/llm   : OpenAI / Google 텍스트 생성 + 실제 토큰 사용량
 *   3) /api/image : OpenAI(gpt-image) 이미지 생성
 *
 *  API 키는 config.json 또는 환경변수로 주입 (브라우저에 노출되지 않음)
 *  실행:  node server.js   (기본 포트 5500, PORT 환경변수로 변경 가능)
 * ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 5500;
const TIMEOUT_MS = 120000; // 외부 API 호출 타임아웃 (이미지 생성 대비 넉넉히)

/* ---------- 정적 파일 MIME ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv":  "text/csv; charset=utf-8",
};

/* ============================================================
 *  설정 로드 (config.json + 환경변수 fallback)
 * ============================================================ */
function loadConfig() {
  const p = path.join(ROOT, "config.json");
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { return null; }
  return cfg;
}

/* 제공자별 API 키 결정: config 우선, 없으면 환경변수 */
function llmKey(provider, c) {
  if (c && c.apiKey) return c.apiKey;
  if (provider === "openai") return process.env.OPENAI_API_KEY || "";
  if (provider === "google") return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  return "";
}
function imageKey(provider, c, cfg) {
  if (c && c.apiKey) return c.apiKey;
  // 이미지 키 미설정 시 동일 벤더의 LLM 키 재사용
  if (provider === "dalle3") return (cfg.llm.openai && cfg.llm.openai.apiKey) || process.env.OPENAI_API_KEY || "";
  return "";
}

/* ============================================================
 *  fetch (타임아웃 + 일시 오류 자동 재시도)
 * ============================================================ */
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function fetchJSON(url, options, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, { ...options, signal: controller.signal });
      const text = await r.text();
      clearTimeout(t);
      // 5xx(일시적 서버/게이트웨이 오류)는 잠시 후 재시도
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
      if (e.name === "AbortError") throw new Error("외부 API 응답 시간 초과"); // 타임아웃은 재시도 안 함
      lastErr = e;                                    // 네트워크 오류(연결 끊김 등)는 재시도
      if (attempt < retries) { await sleep(700 * (attempt + 1)); continue; }
      throw lastErr;
    }
  }
  throw lastErr;
}

/* 외부 API 오류 메시지 구성 (응답이 JSON이 아니어도 안전) */
function apiError(label, status, json, text) {
  const fromJson = json && json.error && (json.error.message || (typeof json.error === "string" ? json.error : null));
  const msg = fromJson || (text ? text.replace(/\s+/g, " ").trim().slice(0, 200) : "") || `HTTP ${status}`;
  return new Error(`${label} 오류 (${status}): ${msg}`);
}

/* ============================================================
 *  LLM 텍스트 생성
 * ============================================================ */
async function callLLM(provider, prompt, cfg) {
  const c = cfg.llm && cfg.llm[provider];
  if (!c) throw new Error(`알 수 없는 LLM 모델: ${provider}`);
  const key = llmKey(provider, c);
  if (!key) throw new Error(`${provider} API 키가 설정되지 않았습니다. config.json 또는 환경변수를 확인하세요.`);

  /* --- Google Gemini --- */
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
    return {
      provider, model: c.model, text: textOut,
      usage: { prompt: um.promptTokenCount || 0, completion: um.candidatesTokenCount || 0, total: um.totalTokenCount || 0 },
    };
  }

  /* --- OpenAI --- */
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
  return {
    provider, model: c.model, text: textOut,
    usage: { prompt: u.prompt_tokens || 0, completion: u.completion_tokens || 0, total: u.total_tokens || 0 },
  };
}

/* ============================================================
 *  이미지 생성
 * ============================================================ */
async function callImage(provider, prompt, cfg) {
  const c = (cfg.image && cfg.image[provider]) || {};
  const key = imageKey(provider, c, cfg);
  if (!key) throw new Error(`${provider} 이미지 API 키가 설정되지 않았습니다. config.json 또는 환경변수를 확인하세요.`);

  /* --- OpenAI 이미지 (gpt-image, /images/generations) --- */
  const defaults = {
    dalle3: { base: "https://api.openai.com/v1", model: "gpt-image-1" },
  };
  const d = defaults[provider];
  if (!d) throw new Error(`알 수 없는 이미지 모델: ${provider}`);
  const base = c.baseUrl || d.base;
  const model = c.model || d.model;
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
  const images = data.map((it) =>
    it.b64_json ? { b64: it.b64_json, mime: "image/png" } : { url: it.url }
  );
  if (!images.length) throw new Error("이미지 결과가 비어 있습니다.");
  return { provider, model, images };
}

/* ============================================================
 *  HTTP 서버
 * ============================================================ */
function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 20e6) req.destroy(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function serveStatic(pathname, res) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }
  // 보안: API 키가 든 설정 파일은 절대 서빙하지 않음
  const base = path.basename(filePath);
  if (base === "config.json" || base === "config.example.json") { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not Found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "POST" && (u.pathname === "/api/llm" || u.pathname === "/api/image")) {
    const cfg = loadConfig();
    if (!cfg) return sendJSON(res, 500, { error: "config.json을 찾을 수 없거나 형식이 잘못되었습니다. config.example.json을 참고해 생성하세요." });

    let body;
    try { body = JSON.parse((await readBody(req)) || "{}"); }
    catch (e) { return sendJSON(res, 400, { error: "잘못된 요청 형식(JSON 파싱 실패)." }); }

    const prompt = (body.prompt || "").toString();
    if (!prompt.trim()) return sendJSON(res, 400, { error: "프롬프트가 비어 있습니다." });

    try {
      const out = u.pathname === "/api/llm"
        ? await callLLM(body.provider, prompt, cfg)
        : await callImage(body.provider, prompt, cfg);
      return sendJSON(res, 200, out);
    } catch (e) {
      return sendJSON(res, 502, { error: e.message || String(e) });
    }
  }

  if (req.method === "GET" && u.pathname === "/api/health") {
    const cfg = loadConfig();
    const status = {};
    if (cfg) {
      ["openai", "google"].forEach((p) => { status[p] = !!llmKey(p, cfg.llm && cfg.llm[p]); });
      ["dalle3"].forEach((p) => { status["img_" + p] = !!imageKey(p, cfg.image && cfg.image[p], cfg); });
    }
    return sendJSON(res, 200, { ok: !!cfg, keys: status });
  }

  serveStatic(u.pathname, res);
});

server.listen(PORT, () => {
  console.log(`AICE GENERATIVE 모의고사 서버 실행 중 → http://localhost:${PORT}`);
  if (!loadConfig()) console.warn("⚠ config.json이 없습니다. config.example.json을 복사해 API 키를 입력하세요.");
});
