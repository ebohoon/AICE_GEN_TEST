/* Vercel 서버리스: POST /api/v1/exam/submit  (답안 제출 → exam.submitted 웹훅) */
const { readJsonBody } = require("../../_shared");
const exam = require("../../_exam");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: { code: "method_not_allowed", message: "POST만 허용됩니다." } });
  try {
    const body = await readJsonBody(req);
    const r = await exam.handleSubmit(body.token, body.answers, exam.baseUrlFrom(req));
    res.status(r.status).json(r.json);
  } catch (e) {
    res.status(500).json({ error: { code: "server_error", message: e.message || String(e) } });
  }
};
