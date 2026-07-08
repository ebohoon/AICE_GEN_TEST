/* ============================================================
 *  스키마 마이그레이션 실행기
 *  - db/schema.sql 을 순서대로 실행
 *  - 실행: POSTGRES_URL 설정 후  `npm run migrate`
 *    (로컬은 `vercel env pull .env` 로 POSTGRES_URL 내려받거나 직접 지정)
 *  - 간단하게는 Vercel 대시보드 DB Query 창에 schema.sql 붙여넣기로 대체 가능
 * ============================================================ */
const fs = require("fs");
const path = require("path");
const { sql } = require("@vercel/postgres");

(async () => {
  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL 이 설정되지 않았습니다. (Vercel Postgres 연결 후 재시도)");
    process.exit(1);
  }
  const ddl = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  // 주석 제거 후 세미콜론 기준 분리
  const statements = ddl
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const st of statements) {
    await sql.query(st);
    console.log("ok:", st.replace(/\s+/g, " ").slice(0, 60), "…");
  }
  console.log(`\n마이그레이션 완료 (${statements.length}개 구문).`);
  process.exit(0);
})().catch((e) => {
  console.error("마이그레이션 실패:", e.message || e);
  process.exit(1);
});
