/* Vercel 서버리스 함수: POST /api/image */
const { loadConfig, callImage, readJsonBody } = require("./_shared");

/* (이미지 생성은 시간이 걸려 maxDuration을 vercel.json에서 60s로 설정) */
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST만 허용됩니다." }); return; }
  try {
    const body = await readJsonBody(req);
    const prompt = (body.prompt || "").toString();
    if (!prompt.trim()) { res.status(400).json({ error: "프롬프트가 비어 있습니다." }); return; }
    const out = await callImage(body.provider, prompt, loadConfig());
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: e.message || String(e) });
  }
};
