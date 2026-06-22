/* ============================================================
 *  AICE GENERATIVE 모의고사 - 프론트엔드 로직
 *  LLM/이미지 호출은 백엔드(/api/llm, /api/image)로 프록시
 * ============================================================ */

/* ---------- 문항 데이터 ---------- */
const CATEGORIES = [
  { id: "A", name: "프롬프트 엔지니어링",        questions: ["A-Q1", "A-Q2"] },
  { id: "B", name: "생성형 AI기반 콘텐츠 제작",  questions: ["B-Q1"] },
  { id: "C", name: "정보 검색 및 수집",          questions: ["C-Q1", "C-Q2"] },
  { id: "D", name: "데이터 분석 및 시각화",      questions: ["D-Q1", "D-Q2"] },
  { id: "E", name: "업무 자동화",                questions: ["E-Q1", "E-Q2"] },
];

const QUESTIONS = {
  "A-Q1": {
    no: "1번", title: "제안서 핵심 메시지 작성 프롬프트",
    body:
`전략 실행 관리 솔루션인 **StrategicFlow**는 조직의 KPI를 자동으로 수집하고 시각화하며, 부서별 전략 과제 진행률을 실시간으로 모니터링하고, 병목이 발생할 경우 자동 알림을 제공하는 기능을 갖춘 솔루션이다.

현재 한 기업은 전사 실행력을 높이기 위해 여러 노력을 해왔지만, 여전히 각 부서의 KPI 달성 현황이 수기 보고 중심으로 수집되고 있다. 또한 부서별 전략 과제 진행률이 서로 다른 양식으로 관리되고 있어 경영진이 전사 현황을 한눈에 파악하기 어렵다. 병목이 발생해도 즉시 감지되지 않아 대응이 늦어지는 문제가 반복되고 있다.

이 기업은 StrategicFlow 도입을 검토하고 있으며, 경영진 보고를 통해 도입 승인을 받고자 한다. 이를 위해 경영진 보고서 첫 장에 들어갈 헤드라인 형태의 핵심 메시지가 필요하다. 핵심 메시지는 StrategicFlow 도입의 필요성과 기대효과를 한눈에 전달해야 한다.

응시자는 생성형 AI에게 이 작업을 수행하도록 지시하는 프롬프트를 작성해야 한다. 프롬프트에는 StrategicFlow의 주요 기능 중 2가지 이상이 포함되도록 해야 하며, 현재 조직이 겪는 문제와 솔루션 도입 후 기대효과가 함께 드러나도록 해야 한다. 또한 "모든 전략 목표 100% 달성"처럼 과장되거나 허위 효능으로 보일 수 있는 표현은 사용하지 않도록 지시해야 한다.

최종 결과물은 조건에 맞는 핵심 메시지 3개와 각 메시지의 핵심 포인트 설명으로 구성되어야 한다. 핵심 메시지는 1~2문장, 50자 내외로 간결하게 작성되어야 하며, 경영진 보고용으로 적합한 격식 있고 신뢰감 있는 어조를 유지해야 한다.`,
  },
  "A-Q2": {
    no: "2번", title: "고객 응대 문구 개선 프롬프트",
    body:
`한 온라인 교육 플랫폼은 최근 수강생과 학부모의 문의가 증가하면서 고객 응대 품질을 개선하려고 한다. 특히 환불, 수강 기간 연장, 강의 오류, 학습 진도 문의 등 민감한 문의가 많아졌고, 상담 담당자마다 답변 방식이 달라 고객이 느끼는 안내 품질에 차이가 발생하고 있다.

플랫폼 운영팀은 고객에게 불필요한 오해를 주지 않으면서도, 회사의 운영 정책을 명확하게 전달하는 답변 문구를 만들고자 한다. 답변은 지나치게 딱딱하지 않아야 하지만, 약속하지 않은 혜택을 제공하는 것처럼 보이거나 회사 책임을 과도하게 인정하는 표현은 피해야 한다.

예를 들어 수강생이 "개인 사정으로 강의를 거의 듣지 못했으니 수강 기간을 무료로 연장해달라"고 문의한 상황을 가정한다. 이때 답변은 고객의 상황에 공감하면서도, 내부 정책 확인이 필요하다는 점을 안내하고, 확인 후 가능한 범위에서 도움을 드리겠다는 방향으로 작성되어야 한다.

응시자는 생성형 AI가 위 상황에 적합한 고객 응대 문구를 작성하도록 지시하는 프롬프트를 작성해야 한다. 프롬프트에는 고객 응대 전문가의 관점이 반영되어야 하며, 고객 상황에 대한 공감, 정책 확인 필요성, 과도한 확답 금지, 친절하지만 신중한 표현이 포함되도록 해야 한다.

최종 결과물은 문자 또는 카카오톡으로 보낼 수 있는 고객 응대 문구 2개 안으로 작성되어야 한다. 문장은 너무 길지 않게 구성하고, 고객에게 부담을 주거나 방어적으로 느껴지는 표현은 피해야 한다. 어조는 정중하고 친절하되, 회사의 입장이 명확하게 드러나야 한다.`,
  },
  "B-Q1": {
    no: "3번", title: "전략 발표용 비전 이미지 제작 프롬프트",
    body:
`국내 통신·플랫폼 기업 A사는 향후 3년간의 중장기 전략으로 **"AI 기반 B2B 디지털 전환 파트너"**라는 포지셔닝을 강화하려고 한다. 전략기획팀은 이 전략을 경영진과 주요 이해관계자에게 발표할 예정이며, 발표 자료의 첫 장에 삽입할 비전 이미지가 필요하다.

비전 이미지의 핵심 메시지는 **"AI로 고객 기업의 의사결정과 운영을 연결하는 통합 파트너"**이다. 이미지는 다양한 산업군의 B2B 고객을 직접적인 장면으로 묘사하기보다는 상징적 요소로 표현해야 한다. 제조, 물류, 금융, 헬스케어, 리테일, 에너지 등 다양한 산업이 하나의 디지털 생태계 안에서 유기적으로 연결되어 있다는 느낌이 들어야 한다.

이미지에서는 사람의 구체적인 행동이나 서사적 장면을 최소화해야 하며, AI를 중심으로 한 연결과 통합 구조가 한눈에 인지되어야 한다. '연결·통합·지능화'라는 전략 키워드는 데이터 흐름, 네트워크 구조, 중심 코어, 노드, 라인 등의 추상적 메타포로 표현되어야 한다.

전략 발표 슬라이드 표지에 활용될 이미지이므로, 텍스트를 배치할 수 있는 여백이 충분히 확보되어야 한다. 이미지는 가로형 16:9 비율이어야 하며, 과도한 장식은 피하고 신뢰감 있고 세련된 기업용 전략 발표 이미지로 완성되어야 한다.

응시자는 생성형 AI 이미지 도구에 바로 입력할 수 있는 수준의 이미지 제작 프롬프트를 작성하도록 AI에게 지시하는 프롬프트를 작성해야 한다. 이때 이미지 프롬프트는 CAST 프레임워크의 4요소인 Content, Action/Atmosphere, Style, Technical Specs를 빠짐없이 반영해야 하며, AI가 잘 이해할 수 있는 명확한 어조로 작성되도록 해야 한다.`,
  },
  "C-Q1": {
    no: "4번", title: "디지털 헬스케어 경쟁사 제휴 현황 조사 프롬프트",
    body:
`한 디지털 헬스케어 기업은 향후 사업 확장과 파트너십 전략 수립을 위해 국내외 주요 경쟁사의 제휴 현황을 조사하려고 한다. 조사 대상은 디지털 치료제, 원격 모니터링, 만성질환 관리 플랫폼 등 디지털 헬스케어 분야에서 활동하는 주요 기업이다.

해당 기업은 단순히 경쟁사 이름을 나열하는 수준이 아니라, 각 경쟁사가 어떤 파트너와 제휴하고 있으며, 해당 제휴가 어떤 전략적 의미를 갖는지 파악하고자 한다. 특히 제휴의 목적, 사업 확장 방식, 생태계 전략, 유통 채널 확보, 기술 통합, 데이터 활용 전략 등을 함께 분석해야 한다.

조사 결과는 전략 보고서에 활용될 예정이므로 신뢰도가 높은 자료를 기반으로 해야 한다. 공식 보도자료, 기업 공식 뉴스룸, 연차보고서, SEC 공시, 규제기관 공시 등 1차 자료를 우선 활용해야 하며, 출처 URL을 명확히 제시해야 한다. 신뢰도가 낮거나 확인이 어려운 정보는 제외해야 한다.

조사 대상 기업은 국내와 해외 기업을 모두 포함하여 총 6개로 구성한다. 각 기업에 대해 주요 제휴/파트너, 정량 데이터 2개 이상, 정성 인사이트, 출처 URL, 신뢰도를 표로 정리해야 한다. 표 작성 후에는 보고서에 바로 활용할 수 있도록 핵심 요약 인사이트도 함께 제시해야 한다.

응시자는 생성형 AI가 이 조사와 정리를 수행하도록 지시하는 프롬프트를 작성해야 한다. 결과물은 전략 보고서에 활용 가능한 수준으로 객관적이고 분석적인 어조를 유지해야 한다.`,
  },
  "C-Q2": {
    no: "5번", title: "글로벌 AI 교육 플랫폼 시장 조사 프롬프트",
    body:
`한 국내 에듀테크 기업은 생성형 AI를 활용한 교육 플랫폼 사업을 확대하기 위해 글로벌 시장 동향을 조사하려고 한다. 이 기업은 기존에 온라인 강의와 학습관리시스템을 운영해왔지만, 최근 AI 튜터, 맞춤형 학습 경로 추천, 자동 피드백, 학습 데이터 분석 기능을 포함한 차세대 교육 플랫폼으로 사업 방향을 전환하고 있다.

전략기획팀은 해외 주요 AI 교육 플랫폼 기업들이 어떤 기능을 제공하고 있으며, 어떤 수익모델을 채택하고 있는지 파악하려고 한다. 조사 대상은 AI 튜터, 개인화 학습, 자동 채점, 학습 분석, 교사용 AI 보조도구 등을 제공하는 글로벌 에듀테크 기업이다.

조사 결과는 신규 서비스 기획과 투자 검토 보고서에 활용될 예정이다. 따라서 단순한 서비스 소개가 아니라, 각 기업의 핵심 기능, 주요 고객, 수익모델, 최근 사업 확장 방향, 국내 기업이 참고할 만한 전략적 시사점을 함께 정리해야 한다.

조사 대상 기업은 해외 기업 5개 이상으로 구성한다. 자료는 기업 공식 홈페이지, 공식 블로그, 보도자료, 투자자 자료, 신뢰도 높은 산업 리포트 등을 우선 활용한다. 출처가 불명확하거나 광고성 홍보 글에만 근거한 정보는 제외해야 한다. 각 기업별로 출처 URL을 함께 제시해야 하며, 확인이 어려운 정보는 추정하지 말고 "공식 확인 제한"으로 표시해야 한다.

응시자는 생성형 AI가 위 조건에 맞게 정보를 검색하고 정리하도록 지시하는 프롬프트를 작성해야 한다. 최종 결과물은 기업별 비교표와 시장 인사이트 요약으로 구성되어야 하며, 신규 서비스 기획자가 바로 참고할 수 있도록 실무적이고 분석적인 어조로 작성되어야 한다.`,
  },
  "D-Q1": {
    no: "6번", title: "연간매출액 영향 요인 상관분석 프롬프트",
    file: { name: "corr_data.xlsx", url: "data/corr_data.xlsx" },
    body:
`한 교육 사업 그룹은 사업부별 연간 매출액에 영향을 미치는 주요 요인을 파악하여 향후 투자 및 운영 전략 수립의 우선순위를 정하고자 한다. 이를 위해 데이터분석팀은 각 사업부의 연간매출액과 운영·성과 관련 지표를 수집하였다.

데이터에는 사업부별 연간매출액, 수강생수, 마케팅비용, 콘텐츠수, 평균수강료, 강사평균경력, 운영연차가 포함되어 있다. 연간매출액은 annual_sales로 표기되며 단위는 억원이다. 수강생수는 student_count로 표기되며 단위는 명이다. 마케팅비용은 mkt_spend로 표기되며 단위는 만원이다. 콘텐츠수는 content_count, 평균수강료는 avg_price, 강사평균경력은 instructor_exp_years, 운영연차는 operating_years로 표기된다.

분석의 목적은 연간매출액과 6개 운영·성과 지표 간의 피어슨 상관계수를 계산하고, 절대값 기준으로 연간매출액과 가장 상관관계가 큰 변수를 식별하는 것이다. 결과는 영어 변수명과 피어슨 상관계수를 공백 없이 쉼표로만 구분하여 한 줄로 제출해야 한다. 예를 들어 avg_price,0.26과 같은 형식이다.

상관계수는 소수 셋째 자리에서 반올림하여 둘째 자리까지 표기해야 하며, 반올림 방식은 ROUND HALF UP을 적용해야 한다. 계산 오류가 발생하지 않도록 정확하게 분석해야 한다.

분석에는 첨부된 엑셀 데이터 파일의 Q06_상관분석 시트를 사용한다.

응시자는 생성형 AI가 위 데이터를 정확히 분석하도록 지시하는 프롬프트를 작성해야 한다. 최종 출력은 설명 없이 정답 형식 한 줄만 나오도록 해야 한다.`,
  },
  "D-Q2": {
    no: "7번", title: "수강생수 데이터 전처리 및 평균 산출 프롬프트",
    file: { name: "preprocess_data.xlsx", url: "data/preprocess_data.xlsx" },
    body:
`KEdulink는 대학, 학원, 온라인교육, 출판 등 다양한 교육 사업을 운영하는 종합 교육그룹이다. 2026년 중장기 전략 수립을 위해 전사 데이터 분석 프로젝트를 진행하고 있으며, 전략기획본부는 각 사업부의 매출액, 비용, 수강생수 데이터를 수집하였다.

그러나 수집된 데이터에는 전처리가 필요한 문제가 있다. 수강생수 일부 값이 비어 있으며, 일부 수강생수 데이터에는 숫자 외에 문자, 기호, 단위가 함께 포함되어 있다. 예를 들어 120명처럼 단위가 붙어 있는 값이 존재한다. 또한 비정상적으로 큰 수강생수 값도 포함되어 있어 이상값 처리가 필요하다.

이번 분석에서는 전처리 대상을 수강생수로만 한정한다. 수강생수의 문자, 기호, 단위는 숫자로 정제해야 한다. 결측값을 제외한 뒤 Q1과 Q3를 계산하여 IQR 기준으로 이상값을 식별해야 한다. Q1과 Q3는 Tukey 방식으로 계산한다. 즉, 정렬 후 하위 50%의 중앙값을 Q1, 상위 50%의 중앙값을 Q3로 사용하며, 데이터 개수가 홀수일 경우 가운데 값인 Q2는 제외한다.

이상값 기준은 IQR 기준 하한인 Q1 − 1.5 × IQR 미만 또는 상한인 Q3 + 1.5 × IQR 초과이다. 이상값을 식별한 뒤에는 이상값을 제외한 데이터로 중앙값을 계산하고, 결측값과 이상값을 모두 해당 중앙값으로 대체해야 한다.

전처리 완료 후 전체 평균 수강생수를 산출해야 한다. 평균값이 소수인 경우 최종 값만 반올림하여 정수로 출력한다. 반올림은 소수 첫째 자리에서 0.5 이상 올림, 즉 ROUND HALF UP 방식을 적용한다.

분석에는 첨부된 엑셀 데이터 파일의 Q07_전처리 시트를 사용한다.

응시자는 생성형 AI가 위 조건에 따라 수강생수 데이터를 전처리하고, 최종 평균 수강생수를 정확히 계산하도록 지시하는 프롬프트를 작성해야 한다. 최종 출력은 필요한 값만 깔끔하게 제시되도록 해야 한다.`,
  },
  "E-Q1": {
    no: "8번", title: "주간 시장 분석 보고서 자동화 프롬프트",
    body:
`한 기업의 전략기획팀은 매주 외부 시장 동향과 경쟁사 움직임을 분석하여 주간 시장 분석 요약 보고서 초안을 작성하고 있다. 이 업무는 반복성이 높고 시간이 많이 소요된다. 담당자는 외부 시장 동향 데이터를 수집한 뒤, 그중 경쟁사와 관련된 자료를 선별하고, 수집한 데이터가 정상적인지 확인한다. 이후 핵심 시장 이슈와 경쟁사 전략을 요약하고, 요약 내용이 적정한지 검토한 뒤, 최종적으로 주간 시장 분석 요약 보고서 초안을 작성한다.

현재는 이 과정이 사람의 수작업에 크게 의존하고 있어 자료 선별 기준이 담당자마다 다르고, 보고서 품질의 일관성이 떨어지는 문제가 있다. 이에 따라 전략기획팀은 AI 에이전트를 활용하여 이 반복 업무를 자동화하려고 한다.

자동화 대상 반복 업무는 다음과 같다. 외부 시장 동향 데이터 수집, 경쟁사 관련 자료 선별, 수집 데이터 정상 여부 확인, 핵심 시장 이슈 및 경쟁사 전략 요약, 요약 내용 적정성 확인, 주간 시장 분석 요약 보고서 초안 작성이다.

응시자는 위 업무를 수행할 수 있는 AI 에이전트용 프롬프트를 작성하도록 생성형 AI에 지시하는 프롬프트를 작성해야 한다. 프롬프트에는 에이전트의 역할, 업무 목표, 입력 정보, 단계별 수행 절차, 자료 선별 기준, 데이터 정상 여부 확인 기준, 요약 내용의 적정성 검토 기준, 최종 보고서 초안의 구성 항목이 포함되어야 한다. 결과물은 사람이 검토하기 쉽도록 구조화되어야 하며, 실제 업무 자동화에 바로 활용할 수 있도록 명확하고 지시형 어조로 작성되어야 한다.`,
  },
  "E-Q2": {
    no: "9번", title: "고객 문의 분류 및 응답 초안 자동화 프롬프트",
    body:
`한 교육 서비스 기업은 홈페이지 문의게시판, 카카오톡 채널, 이메일을 통해 매일 다양한 고객 문의를 받고 있다. 문의 유형은 수강 신청, 결제 오류, 환불 요청, 수강 기간 연장, 강의 재생 오류, 계정 로그인 문제, 학습 진도 확인, 증빙서류 요청 등으로 다양하다.

현재 운영 담당자는 모든 문의를 직접 읽고 유형을 분류한 뒤, 담당 부서에 전달하거나 직접 응답 초안을 작성하고 있다. 이 과정에서 단순 반복 문의에 많은 시간이 소요되고, 문의 유형 분류 기준이 일정하지 않아 처리 우선순위가 뒤섞이는 문제가 발생하고 있다. 특히 환불, 민원, 기술 오류, 결제 문제처럼 빠른 처리가 필요한 문의가 일반 문의와 섞여 확인이 늦어지는 경우가 있다.

기업은 AI 에이전트를 활용하여 고객 문의를 자동으로 분류하고, 긴급도를 판단하며, 담당 부서를 추천하고, 1차 응답 초안을 작성하는 업무를 자동화하려고 한다. 단, AI가 최종 답변을 고객에게 직접 발송하는 것이 아니라, 사람이 검토할 수 있는 초안을 작성하는 수준이어야 한다.

자동화 대상 업무는 다음과 같다. 신규 문의 내용 확인, 문의 유형 분류, 긴급도 판단, 담당 부서 추천, 고객에게 보낼 1차 응답 초안 작성, 담당자가 확인해야 할 주의사항 표시이다.

응답 초안은 고객에게 친절하고 정중해야 하며, 회사 정책이 확인되지 않은 상태에서 환불 가능, 무료 연장 가능, 즉시 처리 가능 등 확정적인 표현을 사용해서는 안 된다. 기술 오류나 결제 오류처럼 확인이 필요한 사안은 담당 부서 확인 후 안내하겠다는 방향으로 작성해야 한다. 고객의 감정이 격앙되어 있거나 민원성이 강한 경우에는 우선 사과와 공감을 표현하되, 책임을 과도하게 인정하는 문구는 피해야 한다.

응시자는 위 업무를 수행할 수 있는 AI 에이전트용 프롬프트를 작성해야 한다. 프롬프트에는 에이전트의 역할, 처리 대상 문의, 분류 기준, 긴급도 판단 기준, 담당 부서 추천 기준, 응답 초안 작성 기준, 금지 표현, 최종 출력 형식이 포함되어야 한다. 결과물은 운영 담당자가 바로 검토할 수 있도록 표 형태로 구조화되어야 하며, 실무에서 활용 가능한 명확하고 신중한 어조로 작성되어야 한다.`,
  },
};

/* 모든 문항 공통 지시사항 */
const COMMON_INSTRUCTION = "위 지문을 바탕으로 역할·맥락·명령·형식·어조 5가지 요소가 모두 포함된 프롬프트를 작성하시오.";

/* 지문 내 간단 마크다운(**굵게**)만 렌더링하고 나머지는 HTML escape */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function renderQuestionBody(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

const QUESTION_ORDER = CATEGORIES.flatMap((c) => c.questions);

/* 이미지 모델 표시 이름 */
const IMG_LABEL = { dalle3: "OpenAI (gpt-image-1)" };

/* 이미지 생성 모델을 사용하는 문항 (그 외는 모두 LLM) */
const IMAGE_QUESTIONS = new Set(["B-Q1"]);

/* ---------- 상태 (localStorage 미사용 — 새로고침하면 전체 초기화) ---------- */
let current = "A-Q1";
let initialized = false;          // 첫 로드 때 빈 답안으로 덮어쓰지 않기 위한 플래그
const answers = {};               // 문항별 답안 + 우측 플레이그라운드(메모리)
const playgroundImages = {};      // 문항별 우측 이미지 결과(메모리)

/* ---------- DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const stepNav      = $("#stepNav");
const tabNav       = $("#tabNav");
const questionTitle = $("#questionTitle");
const questionText = $("#questionText");
const questionInstruction = $("#questionInstruction");
const questionFile = $("#questionFile");
const ansPrompt    = $("#ansPrompt");
const ansResult    = $("#ansResult");
const aiPrompt     = $("#aiPrompt");
const aiResult     = $("#aiResult");
const aiImages     = $("#aiImages");
const tokenCount   = $("#tokenCount");
const submitBtn    = $("#submitBtn");

/* ============================================================
 *  초기화
 * ============================================================ */
init();

function init() {
  renderSteps();
  bindTabs();
  bindButtons();
  bindAutoSave();
  bindModelMode();
  bindIntro();
  loadQuestion(current);
}

/* ---------- 시험 안내 화면 ---------- */
function bindIntro() {
  const intro = $("#introScreen");
  const chk = $("#agreeChk");
  const startBtn = $("#startBtn");
  if (!intro || !startBtn) { startTimer(); return; }

  chk.addEventListener("change", () => { startBtn.disabled = !chk.checked; });
  startBtn.addEventListener("click", () => {
    if (chk && !chk.checked) return;
    intro.classList.add("hidden"); // 안내 화면 숨김 → 시험 화면 노출
    startTimer();                  // 시험 시작 시점에 타이머 시작
  });
}

/* ---------- 스텝(문항) 렌더링 ---------- */
function renderSteps() {
  stepNav.innerHTML = "";
  QUESTION_ORDER.forEach((qid) => {
    const btn = document.createElement("button");
    btn.className = "step";
    btn.dataset.qid = qid;
    btn.innerHTML = `<span class="step-label">${qid}</span><span class="step-dot"></span>`;
    btn.addEventListener("click", () => loadQuestion(qid));
    stepNav.appendChild(btn);
  });
}

/* ---------- 카테고리 탭 ---------- */
function bindTabs() {
  tabNav.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const cat = CATEGORIES.find((c) => c.id === tab.dataset.cat);
      if (cat) loadQuestion(cat.questions[0]);
    });
  });
}

/* ---------- 문항 로드 (좌측 패널) ---------- */
function loadQuestion(qid) {
  if (initialized) persist();   // 떠나는 문항 답안을 localStorage까지 저장 (첫 로드 제외)
  initialized = true;
  current = qid;
  const q = QUESTIONS[qid];
  if (q) {
    questionTitle.textContent = `${q.no}. ${q.title}`;
    questionText.innerHTML = renderQuestionBody(q.body);
    questionInstruction.textContent = "※ " + COMMON_INSTRUCTION;
  } else {
    questionTitle.textContent = "";
    questionText.textContent = "(문항 준비 중)";
    questionInstruction.textContent = "";
  }
  // 첨부파일 다운로드 (해당 문항만 표시)
  if (q && q.file) {
    questionFile.innerHTML = `<a class="dl-file" href="${q.file.url}" download>⬇ 데이터 파일 다운로드 (${escapeHtml(q.file.name)})</a>`;
    questionFile.style.display = "";
  } else {
    questionFile.innerHTML = "";
    questionFile.style.display = "none";
  }
  const a = answers[qid] || {};
  ansPrompt.value = a.prompt || "";
  ansResult.value = a.result || "";
  // 우측 플레이그라운드도 문항별로 복원
  aiPrompt.value = a.aiPrompt || "";
  aiResult.classList.remove("loading");
  aiResult.textContent = a.aiResult || "";
  aiImages.innerHTML = playgroundImages[qid] || "";
  updateActiveStates(qid);
  applyQuestionMode(); // 문항 유형에 맞춰 모델 영역/버튼 전환

  // 첫 문항(A-Q1)에선 '이전' 숨김, 마지막 문항(E-Q2)에선 '다음' → '제출'
  const prevBtn = $("#prevBtn");
  if (prevBtn) prevBtn.style.display = (qid === QUESTION_ORDER[0]) ? "none" : "";
  const nextBtn = $("#nextBtn");
  if (nextBtn) nextBtn.textContent = (qid === QUESTION_ORDER[QUESTION_ORDER.length - 1]) ? "제출" : "다음";
}

function updateActiveStates(qid) {
  const cat = qid.split("-")[0];
  tabNav.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.cat === cat)
  );
  stepNav.querySelectorAll(".step").forEach((s) => {
    const id = s.dataset.qid;
    s.classList.toggle("active", id === qid);
    s.classList.toggle("done", id !== qid && isAnswered(id));
  });
}

function isAnswered(qid) {
  const a = answers[qid];
  return !!(a && (a.prompt?.trim() || a.result?.trim()));
}

/* ============================================================
 *  답안 저장/복원
 * ============================================================ */
function saveCurrentToMemory() {
  answers[current] = {
    prompt: ansPrompt.value,         // 좌측 프롬프트 입력(답안)
    result: ansResult.value,         // 좌측 AI 응답 결과 입력(답안)
    aiPrompt: aiPrompt.value,        // 우측 프롬프트 입력
    aiResult: aiResult.textContent,  // 우측 AI 응답 결과(텍스트)
  };
  playgroundImages[current] = aiImages.innerHTML; // 우측 이미지 결과(세션 한정)
}
function persist() {
  saveCurrentToMemory(); // 메모리에만 보존 (localStorage 미사용 → 새로고침 시 초기화)
}
function bindAutoSave() {
  [ansPrompt, ansResult].forEach((el) =>
    el.addEventListener("input", () => {
      saveCurrentToMemory();
      updateActiveStates(current);
    })
  );
}

/* ============================================================
 *  버튼 동작
 * ============================================================ */
function bindButtons() {
  $("#saveBtn").addEventListener("click", () => {
    persist();
    updateActiveStates(current);
    toast("답변이 저장되었습니다.");
  });
  $("#viewAllBtn").addEventListener("click", showAllAnswers);
  $("#prevBtn").addEventListener("click", () => {
    const idx = QUESTION_ORDER.indexOf(current);
    loadQuestion(QUESTION_ORDER[(idx - 1 + QUESTION_ORDER.length) % QUESTION_ORDER.length]);
  });
  $("#nextBtn").addEventListener("click", () => {
    const idx = QUESTION_ORDER.indexOf(current);
    if (idx === QUESTION_ORDER.length - 1) { // 마지막 문항(E-Q2) → 제출
      persist();
      alert("제출 완료되었습니다.");
      return;
    }
    loadQuestion(QUESTION_ORDER[idx + 1]);
  });
  $("#copyPromptBtn").addEventListener("click", () => copyText(aiPrompt.value, "프롬프트를 복사했습니다."));
  $("#llmLogBtn").addEventListener("click", showLog);
  $("#submitBtn").addEventListener("click", runAI);
  $("#copyAnsBtn").addEventListener("click", () => copyText(aiResult.textContent, "AI 응답 결과를 복사했습니다."));

  // 모달(전체 답변 보기 / LLM 로그) 닫기
  $("#modalCloseBtn").addEventListener("click", closeModal);
  $("#modalCloseBtn2").addEventListener("click", closeModal);
  $("#logCloseBtn").addEventListener("click", closeModal);
  $("#logCloseBtn2").addEventListener("click", closeModal);
  document.querySelectorAll(".modal-overlay").forEach((m) =>
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); })
  );
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

/* ============================================================
 *  문항별 모델 모드 (LLM / 이미지)
 *  - B-Q1 등 이미지 문항: 이미지 생성 모델만 사용
 *  - 그 외 문항: LLM(텍스트) 모델만 사용
 * ============================================================ */
function isImageQuestion(qid) { return IMAGE_QUESTIONS.has(qid || current); }
function selectedImage() { return document.querySelector('input[name="img"]:checked')?.value || null; }
function selectedLLM()   { return document.querySelector('input[name="llm"]:checked')?.value || "openai"; }

function bindModelMode() {
  applyQuestionMode();
}

/* 현재 문항 유형에 맞춰 모델 영역을 활성/비활성하고 버튼·결과 영역을 전환 */
function applyQuestionMode() {
  const imgMode = isImageQuestion(current);
  const llmBox = $("#llmBox");
  const imgBox = $("#imgBox");
  const hint = $("#modeHint");

  // 제한: 문항 유형과 맞지 않는 모델 그룹은 비활성화
  if (llmBox) llmBox.disabled = imgMode;
  if (imgBox) imgBox.disabled = !imgMode;

  if (imgMode) {
    if (!selectedImage()) {
      const first = document.querySelector('input[name="img"]'); // 기본 모델 자동 선택
      if (first) first.checked = true;
    }
    submitBtn.textContent = "▶ 이미지 생성";
    aiResult.style.display = "none";
    aiImages.style.display = "";
    if (hint) hint.textContent = "🖼 이 문항은 이미지 생성 모델을 사용합니다.";
  } else {
    submitBtn.textContent = "▶ 입력";
    aiResult.style.display = "";
    aiImages.style.display = "none";
    aiImages.innerHTML = "";
    if (hint) hint.textContent = "💬 이 문항은 LLM(텍스트) 모델을 사용합니다.";
  }
}

/* ============================================================
 *  AI 호출 (실제 API)
 * ============================================================ */
const llmLog = [];

async function runAI() {
  const prompt = aiPrompt.value.trim();
  if (!prompt) { toast("프롬프트를 입력하세요."); return; }

  setBusy(true);
  try {
    if (isImageQuestion(current)) await generateImage(selectedImage(), prompt);
    else                          await generateText(prompt);
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    setBusy(false);
  }
}

async function generateText(prompt) {
  const provider = selectedLLM();
  aiResult.style.display = "";
  aiResult.classList.add("loading");
  aiResult.textContent = "";

  const data = await postJSON("/api/llm", { provider, prompt });
  aiResult.classList.remove("loading");
  aiResult.textContent = data.text || "(빈 응답)";

  const total = data.usage?.total || 0;
  if (total) setTokens(getTokens() + total);
  llmLog.push({
    time: nowStr(), type: "텍스트", model: data.model || provider,
    prompt, usage: data.usage || {},
  });
}

async function generateImage(model, prompt) {
  aiImages.style.display = "";
  aiImages.innerHTML = `<div class="img-status">「${IMG_LABEL[model] || model}」 이미지를 생성하는 중입니다...</div>`;

  const data = await postJSON("/api/image", { provider: model, prompt });
  renderImages(data.images || []);
  llmLog.push({ time: nowStr(), type: "이미지", model: data.model || model, prompt, usage: {} });
}

function renderImages(images) {
  aiImages.innerHTML = "";
  if (!images.length) {
    aiImages.innerHTML = `<div class="img-status">이미지를 받지 못했습니다.</div>`;
    return;
  }
  images.forEach((im, i) => {
    const src = im.url || `data:${im.mime || "image/png"};base64,${im.b64}`;
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.src = src;
    img.alt = `생성 이미지 ${i + 1}`;
    const a = document.createElement("a");
    a.href = src;
    a.download = `aice-image-${i + 1}.png`;
    a.className = "dl";
    a.textContent = "이미지 다운로드";
    fig.appendChild(img);
    fig.appendChild(a);
    aiImages.appendChild(fig);
  });
}

/* fetch 래퍼: 에러 메시지를 throw */
async function postJSON(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("서버에 연결할 수 없습니다. (node server.js 실행 여부 확인)");
  }
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    // 404/405 + 우리 API의 에러 형식이 아니면 → 백엔드(node server.js)가 아닌 정적 서버에 접속한 경우
    if (!data.error && (res.status === 404 || res.status === 405)) {
      throw new Error("백엔드 API에 연결되지 않았습니다. Live Server 같은 정적 서버가 아니라 'node server.js'로 띄운 주소로 접속했는지 확인하세요.");
    }
    throw new Error(data.error || `요청 실패 (HTTP ${res.status})`);
  }
  return data;
}

function setBusy(b) {
  submitBtn.disabled = b;
  submitBtn.style.opacity = b ? "0.55" : "";
  submitBtn.style.pointerEvents = b ? "none" : "";
}

function showError(msg) {
  if (isImageQuestion(current)) {
    aiImages.style.display = "";
    aiImages.innerHTML = "";
    const e = document.createElement("div");
    e.className = "img-error";
    e.textContent = "⚠ " + msg;
    aiImages.appendChild(e);
  } else {
    aiResult.classList.remove("loading");
    aiResult.style.display = "";
    aiResult.textContent = "⚠ 오류: " + msg;
  }
  toast("요청 처리 중 오류가 발생했습니다.");
}

/* ---------- 토큰 ---------- */
function getTokens() { return parseInt(tokenCount.textContent.replace(/,/g, ""), 10) || 0; }
function setTokens(n) { tokenCount.textContent = n.toLocaleString(); }

/* ---------- LLM 로그 ---------- */
function showLog() {
  const body = $("#logBody");
  body.innerHTML = "";
  if (!llmLog.length) {
    body.innerHTML = `<div class="log-empty">아직 호출 기록이 없습니다.<br>우측 프롬프트 입력 후 「▶ 입력」을 누르면 기록됩니다.</div>`;
  } else {
    llmLog.forEach((l, i) => {
      const u = l.usage || {};
      const item = document.createElement("div");
      item.className = "log-item";
      item.innerHTML =
        `<div class="log-item-head">` +
          `<span class="log-idx">#${i + 1}</span>` +
          `<span class="log-type ${l.type === "이미지" ? "img" : "txt"}">${escapeHtml(l.type)}</span>` +
          `<span class="log-model">${escapeHtml(l.model)}</span>` +
          `<span class="log-time">${escapeHtml(l.time)}</span>` +
        `</div>` +
        `<div class="log-prompt">${escapeHtml(l.prompt)}</div>` +
        (u.total ? `<div class="log-usage">토큰 ${u.total} (입력 ${u.prompt || 0} / 출력 ${u.completion || 0})</div>` : ``);
      body.appendChild(item);
    });
  }
  $("#logProgress").textContent = `총 ${llmLog.length}건 · 누적 토큰 ${getTokens().toLocaleString()}`;
  body.scrollTop = 0;
  $("#logModal").hidden = false;
}

/* ---------- 전체 답변 보기 ---------- */
function showAllAnswers() {
  persist();
  const body = $("#modalBody");
  body.innerHTML = "";
  QUESTION_ORDER.forEach((qid) => {
    const q = QUESTIONS[qid] || {};
    const a = answers[qid] || {};
    const done = isAnswered(qid);
    const p = (a.prompt || "").trim();
    const r = (a.result || "").trim();
    const item = document.createElement("div");
    item.className = "answer-item";
    item.innerHTML =
      `<div class="answer-item-head">` +
        `<span class="answer-item-no">${escapeHtml(q.no || qid)}</span>` +
        `<span class="answer-item-title">${escapeHtml(q.title || "")}</span>` +
        `<span class="answer-badge ${done ? "done" : "todo"}">${done ? "작성완료" : "미작성"}</span>` +
      `</div>` +
      `<div class="answer-field"><div class="answer-field-label">프롬프트 입력</div>` +
        `<div class="answer-field-value ${p ? "" : "empty"}">${p ? escapeHtml(p) : "(미작성)"}</div></div>` +
      `<div class="answer-field"><div class="answer-field-label">AI 응답 결과 입력</div>` +
        `<div class="answer-field-value ${r ? "" : "empty"}">${r ? escapeHtml(r) : "(미작성)"}</div></div>` +
      `<button class="answer-goto" type="button">이 문항으로 이동 →</button>`;
    item.querySelector(".answer-goto").addEventListener("click", () => {
      closeModal();
      loadQuestion(qid);
    });
    body.appendChild(item);
  });
  const done = QUESTION_ORDER.filter(isAnswered).length;
  $("#modalProgress").textContent = `${done} / ${QUESTION_ORDER.length} 작성`;
  body.scrollTop = 0;            // 항상 맨 위에서 열리도록
  $("#answersModal").hidden = false;
}

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach((m) => { m.hidden = true; });
}

function truncate(s, n = 40) {
  if (!s || !s.trim()) return "(미작성)";
  s = s.trim().replace(/\s+/g, " ");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/* ============================================================
 *  타이머
 * ============================================================ */
function startTimer() {
  let remaining = 59 * 60 + 59;
  const el = $("#timeLeft");
  const tick = () => {
    if (remaining <= 0) {
      el.textContent = "00분 00초";
      el.style.color = "#e53935";
      toast("응시 시간이 종료되었습니다.");
      return;
    }
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    el.textContent = `${m}분 ${s}초`;
    if (remaining <= 60) el.style.color = "#e53935";
    remaining--;
    setTimeout(tick, 1000);
  };
  tick();
}

/* ============================================================
 *  유틸
 * ============================================================ */
function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function copyText(text, msg) {
  if (!text || !text.trim()) { toast("복사할 내용이 없습니다."); return; }
  navigator.clipboard?.writeText(text).then(
    () => toast(msg),
    () => toast("복사에 실패했습니다.")
  );
}

let toastTimer;
function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}
