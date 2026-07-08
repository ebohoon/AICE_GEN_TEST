/* Vercel 서버리스: POST /api/v1/exam-sessions/{session_id}/launch-token  (일회용 진입 토큰 발급) */
const exam = require("../../../_exam");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: { code: "method_not_allowed", message: "POST만 허용됩니다." } });
  if (!exam.checkPartner(req.headers)) return res.status(401).json({ error: { code: "unauthorized", message: "API 키가 유효하지 않습니다." } });
  try {
    const r = await exam.handleLaunchToken(req.query.session_id, exam.baseUrlFrom(req));
    res.status(r.status).json(r.json);
  } catch (e) {
    res.status(500).json({ error: { code: "server_error", message: e.message || String(e) } });
  }
};
