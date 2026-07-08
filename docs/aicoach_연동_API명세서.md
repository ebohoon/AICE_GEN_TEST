# AICE GENERATIVE 모의고사 ↔ aicoach.kr 연동 API 명세서 (제안 v0.1)

> 상태: **제안(초안)**. 아래 엔드포인트 중 상당수는 **신규 개발 대상**입니다(9장 참고).
> 현재 플랫폼은 서버 DB 없이 LLM/이미지 프록시만 제공하며, 답안은 클라이언트에서 클립보드로만 복사됩니다.
> 본 문서는 "모의고사를 aicoach.kr에 임베드하고, 응시 결과를 회신"하는 연동을 전제로 합니다.

---

## 1. 연동 개요

aicoach.kr 사용자가 모의고사를 응시하고, 그 결과(답안·객관식 채점·응시 메타데이터)를 aicoach.kr로 돌려주는 흐름.

- **인증**: 파트너 전용 API Key(서버-서버) + 응시자용 일회성 런치 토큰(SSO)
- **결과 전달**: 웹훅(push) 우선, 결과 조회 API(pull) 병행
- **채점**: 객관식(9번)만 자동 채점 가능. 프롬프트/시스템프롬프트 문항은 **자동 채점 불가** → 답안 원문만 전달(채점은 aicoach 측 사람/AI가 수행)

### 1.1 연동 시퀀스

```
[aicoach 백엔드] --(1) 세션 생성 (X-API-Key)-------------> [모의고사 API]
                <--(2) session_id + launch_url(일회성 토큰)--

[aicoach 프론트] --(3) launch_url로 이동(새 창) 또는 임베드--> [모의고사 화면]
   [응시자]      --(4) 시험 응시 → 제출/시간종료------------> [모의고사]

[모의고사]       --(5) 결과 웹훅(서명 포함)----------------> [aicoach callback_url]
[aicoach 백엔드] --(6) (선택) 결과 재조회 (X-API-Key)-------> [모의고사 API]
```

---

## 2. 공통 규약

| 항목 | 내용 |
|------|------|
| Base URL | `https://<배포도메인>` (예: `https://aice-gen.vercel.app`) |
| 프로토콜 | HTTPS 전용 |
| 요청/응답 | `application/json; charset=utf-8` |
| 시간 형식 | ISO 8601 UTC (예: `2026-07-02T09:00:00Z`) |
| 문자 인코딩 | UTF-8 |

---

## 3. 인증

### 3.1 서버-서버 (aicoach 백엔드 → 모의고사 API)
- 헤더 `X-API-Key: <파트너에게 발급한 키>`
- 키는 파트너별로 발급, 서버 환경변수로만 보관(프론트 노출 금지)
- (권장) 요청 위·변조 방지용 서명: `X-Signature: sha256=<HMAC-SHA256(secret, rawBody)>`, `X-Timestamp: <unix초>` (5분 초과 시 거부)

### 3.2 응시자 SSO (일회성 런치 토큰)
- 세션 생성 시 발급되는 `launch_url` 안의 토큰으로 인증(별도 비밀번호 로그인 불필요)
- 토큰: 서명된 JWT, 짧은 만료(기본 15분), **1회용**(첫 사용 시 세션 활성화)

---

## 4. 엔드포인트

### 4.1 시험 세션 생성  `POST /api/v1/exam-sessions`  *(신규)*
서버-서버. aicoach 사용자를 위한 응시 세션과 런치 URL을 생성.

**요청**
```http
POST /api/v1/exam-sessions
X-API-Key: {partner_key}
Content-Type: application/json
```
```json
{
  "round": 2,
  "user": { "id": "aicoach_user_123", "name": "홍길동", "email": "user@ex.com" },
  "duration_min": 60,
  "callback_url": "https://aicoach.kr/api/exam-callback",
  "return_url": "https://aicoach.kr/exam/done",
  "external_ref": "aicoach 수강/주문 식별자"
}
```
| 필드 | 필수 | 설명 |
|------|:--:|------|
| `round` | ✔ | 응시 회차 `1`\|`2`\|`3` |
| `user.id` | ✔ | aicoach 내부 사용자 식별자(결과에 echo) |
| `user.name` | ✔ | 화면 표시/결과용 |
| `user.email` | – | 선택(개인정보 최소화 권장) |
| `duration_min` | – | 제한시간(기본 60) |
| `callback_url` | –* | 결과 웹훅 수신 URL(미지정 시 사전 등록 URL 사용) |
| `return_url` | – | 제출 후 돌아갈 URL |
| `external_ref` | – | 임의 참조값. 결과에 그대로 반환 |

**응답 `201`**
```json
{
  "session_id": "sess_ab12cd34",
  "launch_url": "https://<도메인>/exam?token=<one-time-jwt>",
  "status": "created",
  "expires_at": "2026-07-02T09:15:00Z"
}
```

### 4.2 시험 실행(런치)  `GET /exam?token={jwt}`  *(신규 · 브라우저)*
- aicoach가 **새 창/리다이렉트**(권장) 또는 iframe으로 이 URL을 연다.
- 토큰 검증 후 해당 `round`의 시험 화면을 SSO로 바로 진입(안내 화면 → 시험).
- 제출/시간종료 시: 결과를 서버에 저장 → 웹훅 발송 → `return_url`로 이동.

### 4.3 결과 조회(폴백/재확인)  `GET /api/v1/exam-sessions/{session_id}`  *(신규)*
서버-서버. 웹훅 유실 대비 폴링/대사(reconciliation)용.
```http
GET /api/v1/exam-sessions/sess_ab12cd34
X-API-Key: {partner_key}
```
**응답 `200`** — 4.4의 `data`와 동일 스키마 + `status`(`created`\|`in_progress`\|`submitted`\|`expired`).

### 4.4 결과 웹훅(콜백)  `POST {callback_url}`  *(모의고사 → aicoach, 신규)*
응시 제출/시간종료 시 모의고사 서버가 aicoach로 전송.

**요청(모의고사가 보냄)**
```http
POST {callback_url}
X-Signature: sha256=<HMAC-SHA256(webhook_secret, rawBody)>
X-Timestamp: 1750000000
Content-Type: application/json
```
```json
{
  "event": "exam.submitted",
  "session_id": "sess_ab12cd34",
  "external_ref": "aicoach 수강/주문 식별자",
  "user": { "id": "aicoach_user_123", "name": "홍길동" },
  "round": 2,
  "status": "submitted",
  "submitted_at": "2026-07-02T09:58:12Z",
  "duration_used_sec": 3123,
  "llm_token_total": 15234,
  "auto_score": { "objective": { "correct": 1, "total": 1 } },
  "answers": [
    { "qid": "A-Q1", "no": "1번", "category": "A", "title": "…", "type": "prompt",
      "fields": { "prompt": "...", "result": "..." } },
    { "qid": "B-Q1", "no": "3번", "category": "B", "title": "…", "type": "image",
      "fields": { "q1": "...", "q2": "...", "q3_image_url": "https://<도메인>/uploads/....png" } },
    { "qid": "E-Q1", "no": "8번", "category": "E", "title": "…", "type": "prompt",
      "fields": { "prompt": "..." } },
    { "qid": "E-Q2", "no": "9번", "category": "E", "title": "…", "type": "choice",
      "fields": { "answer": "② …" }, "correct": true }
  ]
}
```
- **aicoach 응답**: `200`을 N초 내 반환. 실패 시 모의고사가 재시도(지수 백오프, 예: 최대 5회).
- **멱등성**: `session_id`+`event` 조합으로 중복 처리 방지.

---

## 5. 데이터 모델 참고

### 5.1 시험 구조(회차 공통)
- 카테고리 5개: A(프롬프트 엔지니어링), B(콘텐츠 제작), C(정보검색), D(데이터 분석), E(업무 자동화)
- 문항 9개(고정 ID): `A-Q1, A-Q2, B-Q1, C-Q1, C-Q2, D-Q1, D-Q2, E-Q1, E-Q2` = 화면상 1~9번
- 회차 1·2·3은 **동일 구조, 지문만 상이**

### 5.2 문항 유형(`type`)과 `fields`
| type | 해당 문항 | fields | 자동채점 |
|------|-----------|--------|:--:|
| `prompt` | 1·2·4·5·6·7번 | `prompt`, `result` | ✕ |
| `image` | 3번 | `q1`, `q2`, `q3_image_url` | ✕ |
| `prompt` (단일) | 8번 | `prompt` | ✕ |
| `choice` | 9번 | `answer` (+ `correct`) | ✔ |

> 6·7번은 데이터 분석 문항으로 별도 데이터 파일(.xlsx)을 다운로드해 사용.

---

## 6. 에러 응답
공통 형식: `{ "error": { "code": "...", "message": "..." } }`

| HTTP | code | 의미 |
|------|------|------|
| 400 | `invalid_request` | 필드 누락/형식 오류 |
| 401 | `unauthorized` | API Key/서명 무효 |
| 403 | `forbidden` | 권한 없음/허용되지 않은 도메인 |
| 404 | `not_found` | 세션 없음 |
| 409 | `already_submitted` | 이미 제출된 세션 |
| 410 | `expired` | 런치 토큰/세션 만료 |
| 429 | `rate_limited` | 호출 한도 초과 |
| 5xx | `server_error` | 서버 오류 |

---

## 7. 보안 고려사항
- API Key/웹훅 시크릿은 서버 보관, 정기 로테이션
- 웹훅 서명(HMAC) + 타임스탬프 검증으로 위조/재전송 차단
- HTTPS 강제, (선택) 서버-서버 IP 허용목록
- 개인정보 최소 수집(이메일 등 선택), 저장 기간·파기 정책 합의
- iframe 임베드 시 `Content-Security-Policy: frame-ancestors` / 서드파티 쿠키 이슈 검토 → **새 창/리다이렉트 방식 권장**

---

## 8. 결정 필요 사항 (양측 협의)
1. **임베드 방식**: 새 창/리다이렉트(권장) vs iframe
2. **결과 전달**: 웹훅 / 폴링 / 둘 다(권장)
3. **이미지 답안(3번)**: 서버 저장 후 URL 제공(권장) vs base64 inline(용량 큼)
4. **채점 범위**: 객관식(9번) 자동채점만 vs 주관식까지 AI 자동채점 추가 개발
5. **재응시 정책**: 1회용 / 재응시 허용 / 회차별 제한
6. **회차 지정**: aicoach가 지정 vs 랜덤/순차
7. **개인정보 범위·보관 기간**
8. **사용량/과금**: 세션당 LLM·이미지 호출 상한, 비용 부담 주체

---

## 9. 신규 개발 필요 항목 (현재 미구현)
현재는 서버 상태 저장이 없고(무상태 서버리스), 답안은 클라이언트 클립보드 복사만 지원합니다. 2번 연동을 위해 아래가 신규로 필요합니다.

- [ ] **세션·결과 저장소(DB)** — 현재 없음(핵심 선행 작업)
- [ ] **답안 서버 제출 파이프라인** — 현재 제출은 클립보드 복사뿐
- [ ] **세션 생성 API** (`POST /api/v1/exam-sessions`)
- [ ] **런치 토큰(JWT) 발급/검증 + SSO 진입** (`GET /exam?token=`)
- [ ] **결과 조회 API** (`GET /api/v1/exam-sessions/{id}`)
- [ ] **결과 웹훅 발송**(서명·재시도)
- [ ] **파트너 API Key 관리**
- [ ] **이미지 답안 저장소**(3번 문항)
- [ ] (선택) **주관식 AI 자동채점** 모듈

---

## 부록. 현재 이미 구현된 API (참고용)
아래는 지금 동작하는 내부 프록시 API로, 위 연동과는 별개입니다.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/login` | 공용 비밀번호 → 토큰 발급 |
| POST | `/api/llm` | `{provider:"openai"\|"google", prompt}` → 텍스트+토큰사용량 |
| POST | `/api/image` | `{provider:"dalle3"\|"nanobanana", prompt}` → 이미지 |
| GET | `/api/health` | 키/인증 설정 상태 |

- 인증: `ACCESS_PASSWORD` 설정 시 `Authorization: Bearer <token>`
- CORS 헤더 없음(브라우저 크로스오리진 직접호출 불가) — 연동 시 별도 처리 필요
