/* ============================================================
 *  스키마 마이그레이션 실행기 (pg)
 *  - db/schema.sql 전체를 한 번에 실행 (simple 프로토콜 = 다중 문장 허용)
 *  - 실행: POSTGRES_URL 설정 후  `npm run migrate`
 *  - 대안: Vercel 대시보드 DB Query 창에 schema.sql 문장을 하나씩 실행
 * ============================================================ */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
  if (!cs) {
    console.error("POSTGRES_URL(또는 DATABASE_URL) 이 설정되지 않았습니다.");
    process.exit(1);
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(cs);
  const client = new Client({ connectionString: cs, ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();
  const ddl = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await client.query(ddl); // 다중 문장 한 번에 실행
  console.log("마이그레이션 완료.");
  await client.end();
  process.exit(0);
})().catch((e) => {
  console.error("마이그레이션 실패:", e.message || e);
  process.exit(1);
});
