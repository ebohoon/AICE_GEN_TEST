# AICE GENERATIVE 모의고사 툴

생성형 AI 활용 역량(프롬프트 엔지니어링 · 콘텐츠 제작 · 정보 검색 · 데이터 분석/시각화 · 업무 자동화)을 평가하는 AICE GENERATIVE 자격증 모의 시험 환경입니다.

## 구성

| 파일 | 설명 |
|------|------|
| `index.html` / `styles.css` / `app.js` | 프론트엔드 (시험 화면) |
| `server.js` | 백엔드 (정적 파일 제공 + LLM/이미지 API 프록시, **의존성 없음**) |
| `config.json` | API 키·모델 설정 (**git 제외**, 직접 채워야 함) |
| `config.example.json` | 설정 템플릿 |

## 실행 방법

### 1) API 키 설정
`config.json`을 열어 사용할 모델의 `apiKey`를 입력합니다.

```json
{
  "llm": {
    "openai": { "apiKey": "sk-...", "model": "gpt-5.4-mini", "baseUrl": "https://api.openai.com/v1" },
    "google": { "apiKey": "AIza...", "model": "gemini-2.5-flash" },
    "xai":    { "apiKey": "xai-...", "model": "grok-4-1-fast" }
  }
}
```

또는 키를 비워두고 **환경변수**로 주입할 수 있습니다.

```powershell
# PowerShell
$env:OPENAI_API_KEY   = "sk-..."
$env:GOOGLE_API_KEY   = "AIza..."   # Gemini / Nano Banana 공용
$env:XAI_API_KEY      = "xai-..."   # Grok 텍스트/이미지 공용
```

> 이미지 모델의 `apiKey`를 비워두면 같은 벤더의 LLM 키를 자동 재사용합니다
> (DALL-E 3 → OpenAI 키, Grok 이미지 → xAI 키, Nano Banana → Google 키).

### 2) 서버 실행
```powershell
node server.js
```
→ 브라우저에서 `http://localhost:5500` 접속. (포트 변경: `$env:PORT=3000; node server.js`)

### 3) Vercel 배포

백엔드는 `api/` 폴더의 **서버리스 함수**(`api/llm.js`, `api/image.js`, `api/health.js`)로 동작합니다. (상시 서버인 `server.js`는 **로컬 개발 전용**이며 Vercel에서는 실행되지 않습니다. 핵심 로직은 `api/_shared.js`에 공유.)

1. GitHub 저장소를 Vercel에 연결 → 푸시 시 자동 배포
2. **환경변수 설정** (Vercel → Project → Settings → Environment Variables):
   - `OPENAI_API_KEY` — OpenAI 키 (텍스트 gpt-5.4-mini + 이미지 gpt-image-1 공용)
   - `GOOGLE_API_KEY` — Google 키 (Gemini)
   - `ACCESS_PASSWORD` — (선택) 로그인 비밀번호. 설정하면 로그인 후에만 이용 가능
3. 환경변수 추가 후 **Redeploy** 해야 반영됨

> `config.json`은 `.gitignore`로 배포에 포함되지 않으므로, Vercel에서는 **반드시 환경변수로 키를 주입**해야 합니다. 함수가 없으면 `/api/*`는 404, 키가 없으면 호출 시 "키가 설정되지 않았습니다" 오류가 납니다.

## 로그인 (접근 제한)

링크만 알면 누구나 접속·API 호출이 가능하므로(=내 API 비용 소모), **공용 비밀번호 1개**로 접근을 제한할 수 있습니다.

- **켜기**: 환경변수 `ACCESS_PASSWORD`에 비밀번호 설정 (로컬은 `config.json`의 `auth.password`)
- **끄기**: 비워두면 로그인 없이 공개 접근 (현재 기본값)
- 인증은 **서버(서버리스 함수)에서 강제**됩니다. `/api/login`이 비밀번호 확인 후 HMAC 서명 토큰을 발급하고, `/api/llm`·`/api/image`는 유효한 토큰이 없으면 **401**을 반환 → 화면을 우회해도 API가 보호됩니다.
- 토큰은 브라우저 `sessionStorage`에 보관되어 새로고침해도 유지(탭을 닫으면 만료, 기본 12시간).
- 설정/변경 후에는 **Redeploy** 필요.

## 모델 ID 참고

화면에 표시되는 이름과 실제 API 모델 ID가 다를 수 있어 `config.json`에서 조정합니다.

| 화면 표시 | 기본 모델 ID | 제공자 / 엔드포인트 |
|-----------|--------------|---------------------|
| Open AI (gpt-5.4-mini) | `gpt-5.4-mini` | OpenAI Chat Completions |
| Google (gemini-2.5) | `gemini-2.5-flash` | Google Generative Language |
| OpenAI (gpt-image-1) | `gpt-image-1` | OpenAI Images (이미지) |
| Google (Nano Banana) | `gemini-2.5-flash-image` | Google Generative Language (이미지) |

## API 엔드포인트

| 메서드 | 경로 | 요청 본문 | 응답 |
|--------|------|-----------|------|
| POST | `/api/llm` | `{ provider, prompt }` | `{ text, usage:{prompt,completion,total} }` |
| POST | `/api/image` | `{ provider, prompt }` | `{ images:[{url}\|{b64,mime}] }` |
| GET | `/api/health` | – | 키 설정 여부 점검 |

## 동작 방식

- 우측 **LLM 모델**만 선택 → `▶ 입력` 시 텍스트 생성, 실제 토큰 사용량이 `LLM 토큰 합계`에 누적됩니다.
- 우측 **이미지 생성 모델**을 선택 → 버튼이 `▶ 이미지 생성`으로 바뀌고, 결과 영역에 이미지가 표시됩니다. (선택된 이미지 라디오를 다시 클릭하면 텍스트 모드로 복귀)

## 보안

- `config.json`은 `.gitignore`에 포함되며, 서버가 해당 파일을 정적 경로로 절대 노출하지 않습니다.
- API 키는 백엔드에서만 사용되고 브라우저로 전달되지 않습니다.
