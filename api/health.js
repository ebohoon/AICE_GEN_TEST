/* Vercel 서버리스 함수: GET /api/health (키 설정 여부 확인) */
const { healthStatus } = require("./_shared");

module.exports = (req, res) => {
  res.status(200).json(healthStatus());
};
