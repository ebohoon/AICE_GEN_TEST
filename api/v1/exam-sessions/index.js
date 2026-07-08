/* Vercel 서버리스: POST /api/v1/exam-sessions  (세션 생성) */
const { readJsonBody } = require("../../_shared");
const exam = require("../../_exam");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: { code: "method_not_allowed", message: "POST만 허용됩니다." } });
  if (!exam.checkPartner(req.headers)) return res.status(401).json({ error: { code: "unauthorized", message: "API 키가 유효하지 않습니다." } });
  try {
    const body = await readJsonBody(req);
    const r = await exam.handleCreateSession(body);
    res.status(r.status).json(r.json);
  } catch (e) {
    res.status(500).json({ error: { code: "server_error", message: e.message || String(e) } });
  }
};
