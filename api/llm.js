/* Vercel 서버리스 함수: POST /api/llm */
const { loadConfig, callLLM, readJsonBody, isAuthorized } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST만 허용됩니다." }); return; }
  if (!isAuthorized(req)) { res.status(401).json({ error: "인증이 필요합니다. 다시 로그인하세요." }); return; }
  try {
    const body = await readJsonBody(req);
    const prompt = (body.prompt || "").toString();
    if (!prompt.trim()) { res.status(400).json({ error: "프롬프트가 비어 있습니다." }); return; }
    const out = await callLLM(body.provider, prompt, loadConfig());
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: e.message || String(e) });
  }
};
