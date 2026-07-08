/* Vercel 서버리스: GET /api/v1/exam-sessions/{session_id}  (결과 조회 = result_url) */
const exam = require("../../../_exam");

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: { code: "method_not_allowed", message: "GET만 허용됩니다." } });
  if (!exam.checkPartner(req.headers)) return res.status(401).json({ error: { code: "unauthorized", message: "API 키가 유효하지 않습니다." } });
  try {
    const r = await exam.handleGetResult(req.query.session_id);
    res.status(r.status).json(r.json);
  } catch (e) {
    res.status(500).json({ error: { code: "server_error", message: e.message || String(e) } });
  }
};
