/* ============================================================
 *  AICE GENERATIVE 모의고사 - 로컬 개발 서버 (Node 내장 모듈만)
 *
 *  역할:
 *   1) 정적 파일(index.html 등) 제공
 *   2) /api/llm   : OpenAI / Google 텍스트 생성 + 실제 토큰 사용량
 *   3) /api/image : OpenAI(gpt-image) 이미지 생성
 *   4) /api/health: 키 설정 여부 확인
 *
 *  핵심 로직은 api/_shared.js에 있으며 Vercel 서버리스 함수(api/*.js)와 공유합니다.
 *  API 키는 config.json(로컬) 또는 환경변수로 주입 (브라우저에 노출되지 않음)
 *  실행:  node server.js   (기본 포트 5500, PORT 환경변수로 변경 가능)
 * ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const shared = require("./api/_shared");

const ROOT = __dirname;
const PORT = process.env.PORT || 5500;

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
 *  HTTP 서버
 * ============================================================ */
function sendJSON(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
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
    let body;
    try { body = JSON.parse((await readBody(req)) || "{}"); }
    catch (e) { return sendJSON(res, 400, { error: "잘못된 요청 형식(JSON 파싱 실패)." }); }

    const prompt = (body.prompt || "").toString();
    if (!prompt.trim()) return sendJSON(res, 400, { error: "프롬프트가 비어 있습니다." });

    try {
      const cfg = shared.loadConfig();
      const out = u.pathname === "/api/llm"
        ? await shared.callLLM(body.provider, prompt, cfg)
        : await shared.callImage(body.provider, prompt, cfg);
      return sendJSON(res, 200, out);
    } catch (e) {
      return sendJSON(res, 502, { error: e.message || String(e) });
    }
  }

  if (req.method === "GET" && u.pathname === "/api/health") {
    return sendJSON(res, 200, shared.healthStatus());
  }

  serveStatic(u.pathname, res);
});

server.listen(PORT, () => {
  console.log(`AICE GENERATIVE 모의고사 서버 실행 중 → http://localhost:${PORT}`);
});
