/* Vercel 서버리스 함수: POST /api/login (공용 비밀번호 확인 → 토큰 발급) */
const { authRequired, checkPassword, makeToken, readJsonBody } = require("./_shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST만 허용됩니다." }); return; }
  // 비밀번호 미설정 시 인증 비활성 (공개 접근)
  if (!authRequired()) { res.status(200).json({ ok: true, authDisabled: true, token: null }); return; }
  try {
    const body = await readJsonBody(req);
    if (checkPassword(body.password)) {
      res.status(200).json({ ok: true, token: makeToken() });
    } else {
      res.status(401).json({ error: "인증코드가 올바르지 않습니다." });
    }
  } catch (e) {
    res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
  }
};
