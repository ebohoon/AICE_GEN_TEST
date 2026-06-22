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
`기업용 SaaS 솔루션 기업 **넥사플로우(NexaFlow)**는 전략 실행 관리 솔루션 **StrategicFlow**를 개발하여 대기업 및 중견기업을 대상으로 영업을 확대하고 있다. StrategicFlow는 조직의 KPI를 자동으로 수집하고 시각화하며, 부서별 전략 과제 진행률을 실시간으로 모니터링하고, 병목이 발생할 경우 자동 알림을 제공하는 기능을 갖춘 솔루션이다.

현재 **동서테크그룹**의 전략기획실은 전사 실행력을 높이기 위해 여러 관리 체계를 도입했지만, 여전히 각 부서의 KPI 달성 현황이 수기 보고 중심으로 취합되고 있다. 또한 부서별 전략 과제 진행률이 서로 다른 양식으로 관리되어 경영진이 전사 현황을 한눈에 파악하기 어렵다. 특히 주요 전략 과제에서 지연이나 병목이 발생해도 즉시 감지되지 않아, 월간 회의 이후에야 문제가 확인되는 경우가 반복되고 있다.

동서테크그룹 전략기획실의 **DX전략 담당자 박지훈 매니저**는 StrategicFlow 도입을 검토하고 있으며, 다음 주 경영진 회의에서 도입 필요성을 보고해야 한다. 보고서 첫 장에는 솔루션의 기능을 길게 설명하기보다, 현재 조직의 문제와 도입 기대효과를 한눈에 전달할 수 있는 헤드라인 형태의 핵심 메시지가 필요하다.

핵심 메시지에는 StrategicFlow의 주요 기능 중 2가지 이상이 포함되어야 한다. 또한 현재 조직이 겪고 있는 수기 보고, 부서별 관리 양식 차이, 병목 대응 지연 등의 문제와 솔루션 도입 후 기대효과가 함께 드러나야 한다. 단, "모든 전략 목표 100% 달성", "조직 문제 완전 해결"처럼 과장되거나 허위 효능으로 보일 수 있는 표현은 사용하지 않아야 한다.

최종 결과물은 조건에 맞는 핵심 메시지 3개와 각 메시지의 핵심 포인트 설명으로 구성되어야 한다. 핵심 메시지는 1~2문장, 50자 내외로 간결하게 작성되어야 하며, 경영진 보고용으로 적합한 격식 있고 신뢰감 있는 어조를 유지해야 한다.`,
  },
  "A-Q2": {
    no: "2번", title: "고객 응대 문구 개선 프롬프트",
    body:
`온라인 직무교육 플랫폼 **런업클래스(RunUp Class)**는 직장인과 취업준비생을 대상으로 AI, 데이터 분석, 마케팅, 개발 강의를 제공하고 있다. 최근 수강생 수가 증가하면서 홈페이지 문의게시판과 카카오톡 채널을 통한 고객 문의도 함께 늘고 있다. 특히 환불, 수강 기간 연장, 강의 오류, 학습 진도 문의처럼 민감한 문의가 많아졌고, 상담 담당자마다 답변 방식이 달라 고객이 느끼는 안내 품질에 차이가 발생하고 있다.

런업클래스 운영지원팀의 **CS 운영 담당자 이서연 주임**은 고객 응대 문구의 품질을 개선하고, 상담 담당자들이 참고할 수 있는 표준 답변 문구를 만들고자 한다. 특히 회사의 운영 정책을 명확하게 전달하면서도 고객에게 불필요한 오해를 주지 않는 표현이 필요하다. 답변은 지나치게 딱딱하지 않아야 하지만, 약속하지 않은 혜택을 제공하는 것처럼 보이거나 회사 책임을 과도하게 인정하는 표현은 피해야 한다.

예를 들어 수강생이 "개인 사정으로 강의를 거의 듣지 못했으니 수강 기간을 무료로 연장해달라"고 문의한 상황을 가정한다. 해당 고객은 결제 후 수강 가능 기간이 거의 종료된 상태이며, 실제 수강률은 낮지만 회사의 강의 재생 오류나 시스템 장애가 확인된 상황은 아니다. 따라서 답변에는 고객의 상황에 대한 공감은 포함하되, 무료 연장 가능 여부를 바로 확정해서는 안 된다.

이서연 주임은 생성형 AI를 활용하여 이 상황에 적합한 고객 응대 문구를 작성하려고 한다. 문구에는 고객 상황에 대한 공감, 내부 정책 확인 필요성, 확인 후 가능한 범위에서 도움을 드리겠다는 안내가 포함되어야 한다. 동시에 과도한 확답, 불필요한 사과, 회사 책임을 인정하는 표현은 피해야 한다.

최종 결과물은 문자 또는 카카오톡으로 보낼 수 있는 고객 응대 문구 2개 안으로 작성되어야 한다. 각 문구는 너무 길지 않아야 하며, 고객에게 부담을 주거나 방어적으로 느껴지는 표현은 피해야 한다. 어조는 정중하고 친절하되, 회사의 입장이 명확하게 드러나야 한다.`,
  },
  "B-Q1": {
    no: "3번", title: "전략 발표용 비전 이미지 제작 프롬프트",
    answerFields: [
      { key: "q1", label: "Q-1. 이미지 생성 프롬프트를 작성하기 위한 요청문", required: true, guide: "(프롬프트 제출) AI에게 이미지 생성 프롬프트를 만들어 달라고 요청한 프롬프트", placeholder: "이미지 생성 프롬프트 작성 요청문", type: "text" },
      { key: "q2", label: "Q-2. 이미지 생성 프롬프트", required: true, guide: "(Q-1로 생성된 프롬프트 및 이미지 생성에 실제 사용한 프롬프트)", placeholder: "이미지 생성 프롬프트", type: "text" },
      { key: "q3", label: "Q-3. 이미지 첨부", required: true, guide: "생성한 이미지를 첨부하세요", type: "image" },
    ],
    body:
`국내 통신·플랫폼 기업 **온링크커넥트(OnLink Connect)**는 기존 통신 인프라 사업을 넘어, 향후 3년간의 중장기 전략으로 **"AI 기반 B2B 디지털 전환 파트너"**라는 포지셔닝을 강화하려고 한다. 온링크커넥트 전략기획본부의 **브랜드전략 담당자 정하윤 매니저**는 이 전략을 경영진과 주요 이해관계자에게 발표할 자료를 준비하고 있다.

발표 자료의 첫 장에는 회사의 전략 방향을 직관적으로 보여줄 수 있는 비전 이미지가 필요하다. 비전 이미지의 핵심 메시지는 **"AI로 고객 기업의 의사결정과 운영을 연결하는 통합 파트너"**이다. 이미지는 온링크커넥트가 단순 통신망 제공자가 아니라, 다양한 산업 고객의 데이터와 운영 흐름을 AI로 연결하는 파트너라는 점을 보여주어야 한다.

이미지에는 제조, 물류, 금융, 헬스케어, 리테일, 에너지 등 다양한 B2B 산업군이 포함되어야 하지만, 실제 공장 직원이나 의사, 금융 상담사처럼 구체적인 사람 중심 장면을 직접 묘사해서는 안 된다. 각 산업은 기어, 큐브, 그래프, 심전도 라인, 바코드, 전력망 등 상징적 요소로 표현되어야 하며, 이 요소들이 하나의 디지털 생태계 안에서 유기적으로 연결된 구조로 보여야 한다.

이미지의 중심에는 AI 코어 또는 디지털 허브가 배치되어야 하며, 여기서 데이터 흐름, 네트워크 라인, 노드, 빛의 연결선 등이 여러 산업 요소로 확장되는 방식이 적절하다. '연결·통합·지능화'라는 전략 키워드는 추상적인 메타포로 표현되어야 한다. 사람의 구체적인 행동이나 서사적 장면은 최소화하고, AI를 중심으로 한 연결과 통합 구조가 한눈에 인지되어야 한다.

전략 발표 슬라이드 표지에 활용될 이미지이므로, 제목과 부제목을 배치할 수 있는 여백이 충분히 확보되어야 한다. 이미지는 가로형 16:9 비율이어야 하며, 과도한 장식은 피하고 신뢰감 있고 세련된 기업용 전략 발표 이미지로 완성되어야 한다. 또한 이미지 안에 불필요한 텍스트, 로고, 워터마크가 생성되지 않도록 해야 한다.

정하윤 매니저는 생성형 AI 이미지 도구에 바로 입력할 수 있는 수준의 이미지 제작 프롬프트를 만들고자 한다. 이때 이미지 프롬프트에는 CAST 프레임워크의 4요소인 Content, Action/Atmosphere, Style, Technical Specs가 빠짐없이 반영되어야 한다.`,
  },
  "C-Q1": {
    no: "4번", title: "디지털 헬스케어 경쟁사 제휴 현황 조사 프롬프트",
    body:
`디지털 헬스케어 스타트업 **메디핏랩스(MediFit Labs)**는 만성질환 관리와 원격 모니터링 솔루션을 개발하고 있다. 회사는 향후 보험사, 병원, 디바이스 기업, 플랫폼 기업과의 제휴를 확대하려고 하며, 이를 위해 국내외 주요 경쟁사의 제휴 현황을 조사하고자 한다.

메디핏랩스 사업개발팀의 **파트너십 전략 담당자 강민수 대리**는 디지털 치료제, 원격 모니터링, 만성질환 관리 플랫폼 분야에서 활동하는 주요 기업들이 어떤 방식으로 파트너십을 구축하고 있는지 파악해야 한다. 단순히 경쟁사 이름을 나열하는 수준이 아니라, 각 기업이 어떤 파트너와 제휴하고 있으며 해당 제휴가 어떤 전략적 의미를 갖는지 분석해야 한다.

특히 제휴의 목적, 사업 확장 방식, 생태계 전략, 유통 채널 확보, 기술 통합, 데이터 활용 전략 등을 함께 살펴봐야 한다. 예를 들어 보험사와의 제휴는 고객 접근성과 비용 보상 구조 확보 측면에서 의미가 있을 수 있고, 웨어러블 기기 기업과의 제휴는 데이터 수집 및 사용자 접점 확대 측면에서 의미가 있을 수 있다. 병원이나 의료기관과의 협력은 임상 신뢰도와 서비스 검증 측면에서 중요할 수 있다.

조사 결과는 메디핏랩스의 2026년 파트너십 전략 보고서에 활용될 예정이다. 따라서 신뢰도가 높은 자료를 기반으로 해야 하며, 공식 보도자료, 기업 공식 뉴스룸, 연차보고서, SEC 공시, 규제기관 공시 등 1차 자료를 우선 활용해야 한다. 출처 URL을 명확히 제시해야 하며, 신뢰도가 낮거나 확인이 어려운 정보는 제외해야 한다.

조사 대상 기업은 국내와 해외 기업을 모두 포함하여 총 6개로 구성한다. 각 기업에 대해 주요 제휴/파트너, 정량 데이터 2개 이상, 정성 인사이트, 출처 URL, 신뢰도를 표로 정리해야 한다. 표 작성 후에는 보고서에 바로 활용할 수 있도록 핵심 요약 인사이트도 함께 제시해야 한다.`,
  },
  "C-Q2": {
    no: "5번", title: "글로벌 AI 교육 플랫폼 시장 조사 프롬프트",
    body:
`국내 에듀테크 기업 **에듀브릿지AI(EduBridge AI)**는 성인 직무교육과 기업교육을 제공하는 온라인 교육 플랫폼을 운영하고 있다. 기존에는 녹화 강의와 학습관리시스템 중심으로 서비스를 제공했지만, 최근 생성형 AI 기술을 활용한 AI 튜터, 맞춤형 학습 경로 추천, 자동 피드백, 학습 데이터 분석 기능을 포함한 차세대 교육 플랫폼으로 사업 방향을 전환하고 있다.

에듀브릿지AI 신사업기획팀의 **AI서비스 기획 담당자 최유진 매니저**는 신규 서비스 기획안 작성을 위해 글로벌 AI 교육 플랫폼 시장을 조사해야 한다. 해외 주요 AI 교육 플랫폼 기업들이 어떤 기능을 제공하고 있으며, 어떤 고객을 대상으로 서비스를 운영하고, 어떤 수익모델을 채택하고 있는지 파악하는 것이 목적이다.

조사 대상은 AI 튜터, 개인화 학습, 자동 채점, 학습 분석, 교사용 AI 보조도구 등을 제공하는 글로벌 에듀테크 기업이다. 단순한 서비스 소개가 아니라, 각 기업의 핵심 기능, 주요 고객, 수익모델, 최근 사업 확장 방향, 국내 기업이 참고할 만한 전략적 시사점을 함께 정리해야 한다. 예를 들어 개인 학습자를 대상으로 하는 구독형 모델인지, 학교나 기업을 대상으로 하는 B2B 라이선스 모델인지, 교사용 도구 중심인지, 학습자 맞춤형 튜터 중심인지 등을 구분해야 한다.

조사 결과는 신규 서비스 기획과 투자 검토 보고서에 활용될 예정이다. 자료는 기업 공식 홈페이지, 공식 블로그, 보도자료, 투자자 자료, 신뢰도 높은 산업 리포트를 우선 활용해야 한다. 출처가 불명확하거나 광고성 홍보 글에만 근거한 정보는 제외해야 한다. 각 기업별로 출처 URL을 함께 제시해야 하며, 확인이 어려운 정보는 추정하지 말고 "공식 확인 제한"으로 표시해야 한다.

조사 대상 기업은 해외 기업 5개 이상으로 구성한다. 최종 결과물은 기업별 비교표와 시장 인사이트 요약으로 구성되어야 하며, 신규 서비스 기획자가 바로 참고할 수 있도록 실무적이고 분석적인 어조로 작성되어야 한다.`,
  },
  "D-Q1": {
    no: "6번", title: "연간매출액 영향 요인 상관분석 프롬프트",
    file: { name: "corr_data.xlsx", url: "data/corr_data.xlsx" },
    body:
`교육 사업 그룹 **케이러닝그룹(K-Learning Group)**은 대학, 학원, 온라인교육, 출판, 기업교육 등 여러 교육 사업부를 운영하고 있다. 최근 경영기획실은 2026년 투자 우선순위를 정하기 위해 각 사업부의 연간 매출액에 영향을 미치는 주요 요인을 분석하고자 한다.

케이러닝그룹 경영기획실의 **데이터 분석 담당자 윤태호 사원**은 데이터분석팀이 수집한 사업부별 운영 데이터를 기반으로 상관분석을 수행해야 한다. 데이터에는 각 사업부의 연간매출액과 수강생수, 마케팅비용, 콘텐츠수, 평균수강료, 강사평균경력, 운영연차가 포함되어 있다.

연간매출액은 annual_sales로 표기되며 단위는 억원이다. 수강생수는 student_count로 표기되며 단위는 명이다. 마케팅비용은 mkt_spend로 표기되며 단위는 만원이다. 콘텐츠수는 content_count, 평균수강료는 avg_price, 강사평균경력은 instructor_exp_years, 운영연차는 operating_years로 표기된다.

분석의 목적은 연간매출액과 6개 운영·성과 지표 간의 피어슨 상관계수를 계산하고, 절대값 기준으로 연간매출액과 가장 상관관계가 큰 변수를 식별하는 것이다. 이를 통해 향후 투자와 운영 개선 전략을 수립할 때 어떤 지표를 우선적으로 살펴볼지 판단하려고 한다.

분석에는 첨부된 엑셀 데이터 파일의 corr_data.xlsx 시트를 사용한다. 결과는 영어 변수명과 피어슨 상관계수를 공백 없이 쉼표로만 구분하여 한 줄로 제출해야 한다. 예를 들어 avg_price,0.26과 같은 형식이다. 상관계수는 소수 셋째 자리에서 반올림하여 둘째 자리까지 표기해야 하며, 반올림 방식은 ROUND HALF UP을 적용해야 한다.

최종 출력에는 계산 과정 설명이나 표를 포함하지 말고, 정답 형식 한 줄만 나오도록 해야 한다.`,
  },
  "D-Q2": {
    no: "7번", title: "수강생수 데이터 전처리 및 평균 산출 프롬프트",
    file: { name: "preprocess_data.xlsx", url: "data/preprocess_data.xlsx" },
    body:
`종합 교육기업 **케이에듀링크(KEdulink)**는 대학, 학원, 온라인교육, 출판 등 다양한 교육 사업을 운영하고 있다. 2026년 중장기 전략 수립을 위해 전사 데이터 분석 프로젝트를 진행하고 있으며, 전략기획본부는 각 사업부의 매출액, 비용, 수강생수 데이터를 수집하였다.

케이에듀링크 전략기획본부의 **데이터 운영 담당자 한서진 주임**은 각 사업부의 평균 수강생수를 산출해야 한다. 하지만 수집된 원본 데이터에는 전처리가 필요한 문제가 있다. 일부 사업부의 수강생수 값이 비어 있으며, 일부 수강생수 데이터에는 숫자 외에 문자, 기호, 단위가 함께 포함되어 있다. 예를 들어 120명처럼 단위가 붙어 있는 값이 존재한다. 또한 비정상적으로 큰 수강생수 값도 포함되어 있어 이상값 처리가 필요하다.

이번 분석에서는 전처리 대상을 수강생수로만 한정한다. 매출액이나 비용 데이터에 문자나 결측값이 있더라도 이번 작업에서는 처리 대상이 아니다. 수강생수의 문자, 기호, 단위는 숫자로 정제해야 한다. 결측값을 제외한 뒤 Q1과 Q3를 계산하여 IQR 기준으로 이상값을 식별해야 한다.

Q1과 Q3는 Tukey 방식으로 계산한다. 즉, 정렬 후 하위 50%의 중앙값을 Q1, 상위 50%의 중앙값을 Q3로 사용하며, 데이터 개수가 홀수일 경우 가운데 값인 Q2는 제외한다. 이상값 기준은 IQR 기준 하한인 Q1 − 1.5 × IQR 미만 또는 상한인 Q3 + 1.5 × IQR 초과이다.

이상값을 식별한 뒤에는 이상값을 제외한 데이터로 중앙값을 계산하고, 결측값과 이상값을 모두 해당 중앙값으로 대체해야 한다. 전처리 완료 후 전체 평균 수강생수를 산출해야 한다. 평균값이 소수인 경우 최종 값만 반올림하여 정수로 출력한다. 반올림은 소수 첫째 자리에서 0.5 이상 올림, 즉 ROUND HALF UP 방식을 적용한다.

분석에는 첨부된 엑셀 데이터 파일의 preprocess_data.xlsx 시트를 사용한다. 최종 출력은 필요한 값만 깔끔하게 제시되어야 하며, 불필요한 설명이나 중간 계산 과정은 포함하지 않는다.`,
  },
  "E-Q1": {
    no: "8번", title: "주간 시장 분석 보고서 자동화 프롬프트",
    body:
`산업용 로봇 솔루션 기업 **로보인사이트(RoboInsight)**는 제조업 고객을 대상으로 자동화 설비와 AI 기반 공정 분석 솔루션을 제공하고 있다. 로보인사이트 전략기획팀은 매주 외부 시장 동향과 경쟁사 움직임을 분석하여 주간 시장 분석 요약 보고서 초안을 작성하고 있다.

전략기획팀의 **시장분석 담당자 오현우 대리**는 매주 월요일 오전마다 산업 뉴스, 경쟁사 보도자료, 투자 동향, 정부 정책 발표, 고객 산업별 기술 트렌드를 확인한다. 이후 수집한 자료 중 로보인사이트의 사업과 관련성이 높은 내용을 선별하고, 핵심 시장 이슈와 경쟁사 전략을 요약하여 팀장에게 보고한다.

현재 이 업무는 반복성이 높고 시간이 많이 소요된다. 담당자가 직접 외부 시장 동향 데이터를 수집한 뒤, 그중 경쟁사 관련 자료를 선별하고, 수집한 데이터가 정상적인지 확인한다. 이후 핵심 시장 이슈와 경쟁사 전략을 요약하고, 요약 내용이 적정한지 검토한 뒤, 최종적으로 주간 시장 분석 요약 보고서 초안을 작성한다.

그러나 이 과정이 사람의 수작업에 크게 의존하고 있어 자료 선별 기준이 담당자마다 다르고, 보고서 품질의 일관성이 떨어지는 문제가 있다. 특히 단순 뉴스 요약과 실제 전략적 의미가 있는 이슈가 섞여 보고서의 우선순위가 불명확해지는 경우가 있다. 이에 따라 전략기획팀은 AI 에이전트를 활용하여 반복적인 시장 분석 업무를 자동화하려고 한다.

자동화 대상 반복 업무는 외부 시장 동향 데이터 수집, 경쟁사 관련 자료 선별, 수집 데이터 정상 여부 확인, 핵심 시장 이슈 및 경쟁사 전략 요약, 요약 내용 적정성 확인, 주간 시장 분석 요약 보고서 초안 작성이다.

AI 에이전트용 프롬프트에는 에이전트의 역할, 업무 목표, 입력 정보, 단계별 수행 절차, 자료 선별 기준, 데이터 정상 여부 확인 기준, 요약 내용의 적정성 검토 기준, 최종 보고서 초안의 구성 항목이 포함되어야 한다. 결과물은 사람이 검토하기 쉽도록 구조화되어야 하며, 실제 업무 자동화에 바로 활용할 수 있도록 명확하고 지시형 어조로 작성되어야 한다.`,
  },
  "E-Q2": {
    no: "9번", title: "맞춤형 이메일 자동 발송 업무 흐름",
    instruction: "보기 ①~⑤ 중 가장 적절한 것을 하나 선택하시오.",
    // 정답: ② (고객 정보 관리 → 콘텐츠 생성 → 이메일 초안 검토 및 확정 → 이메일 발송 → 결과 기록 및 리포트 저장)
    answerFields: [
      { key: "answer", label: "정답 선택", required: true, type: "choice", options: [
        "① 콘텐츠 생성 → 고객 정보 관리 → 이메일 발송 → 이메일 초안 검토 및 확정 → 결과 기록 및 리포트 저장",
        "② 고객 정보 관리 → 콘텐츠 생성 → 이메일 초안 검토 및 확정 → 이메일 발송 → 결과 기록 및 리포트 저장",
        "③ 고객 정보 관리 → 이메일 발송 → 콘텐츠 생성 → 결과 기록 및 리포트 저장 → 이메일 초안 검토 및 확정",
        "④ 이메일 초안 검토 및 확정 → 고객 정보 관리 → 콘텐츠 생성 → 이메일 발송 → 결과 기록 및 리포트 저장",
        "⑤ 결과 기록 및 리포트 저장 → 고객 정보 관리 → 콘텐츠 생성 → 이메일 초안 검토 및 확정 → 이메일 발송",
      ] },
    ],
    body:
`건강기능식품 브랜드 **바이탈그린(VitalGreen)**은 신제품 '슬립밸런스' 출시를 앞두고 기존 고객에게 맞춤형 이메일을 발송하려고 한다. 바이탈그린 마케팅팀은 기존 구매 고객, 장바구니 이탈 고객, 수면 관련 문의 고객, 정기구독 고객을 대상으로 각각 다른 내용의 이메일을 보내고자 한다.

마케팅팀의 **CRM 캠페인 담당자 김도윤 주임**은 기존에는 고객 정보를 직접 확인한 뒤, 고객 유형에 따라 이메일 내용을 작성하고, 발송 대상자를 선별한 후 Gmail을 통해 개별적으로 이메일을 발송했다. 이후 발송 여부와 고객 반응을 별도의 시트에 수기로 기록했기 때문에 업무 시간이 많이 소요되었고, 발송 누락이나 기록 오류가 발생하는 문제가 있었다.

이에 따라 바이탈그린은 반복적인 이메일 발송 업무를 자동화하고자 한다. 고객 정보는 Google Sheets에 저장되어 있으며, 시트에는 고객명, 이메일 주소, 관심 제품군, 구매 이력, 고객 등급, 최근 문의 내용 등이 포함되어 있다. 이메일 문구는 고객별 특성에 맞게 작성되어야 하므로 ChatGPT를 활용해 개인화된 이메일 초안을 생성하려고 한다.

전체 자동화 흐름은 Power Automate가 담당한다. Power Automate는 Google Sheets의 고객 정보를 불러오고, ChatGPT를 호출하여 고객별 맞춤형 이메일 내용을 생성하며, 생성된 이메일 초안을 다시 Google Sheets에 저장하도록 연결한다. 단, 고객에게 발송되는 이메일은 외부로 직접 전달되는 메시지이므로, 담당자가 생성된 초안을 먼저 검토하고 확정하는 과정이 필요하다. 검토가 완료된 이메일만 Gmail을 통해 발송되어야 한다.

이메일 발송 후에는 발송 일시, 발송 성공 여부, 발송 대상 고객, 사용된 이메일 제목, 후속 조치 필요 여부 등을 Google Sheets에 자동으로 기록해야 한다. 또한 향후 캠페인 성과 분석을 위해 발송 결과를 리포트 형태로 저장해야 한다.

다음 중 위 상황에서 맞춤형 이메일 자동 발송 업무 흐름의 순서로 가장 적절한 것은?`,
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

/* 좌측 답안 입력 필드 정의 (문항별 override: QUESTIONS[qid].answerFields) */
const DEFAULT_ANSWER_FIELDS = [
  { key: "prompt", label: "프롬프트 입력", required: true, guide: "※ 답안 도출을 위해 AI 모델에 요청한 프롬프트를 입력하세요", placeholder: "프롬프트 입력 창", type: "text" },
  { key: "result", label: "AI 응답 결과 입력", required: true, guide: "※ AI 응답 결과를 그대로 입력하지 말고 문제에 맞는 답안을 입력하세요", placeholder: "AI 응답 결과 입력 창", type: "text" },
];
function getAnswerFields(qid) {
  return (QUESTIONS[qid] && QUESTIONS[qid].answerFields) || DEFAULT_ANSWER_FIELDS;
}

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
const answerFields = $("#answerFields");
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
    const instr = (q.instruction !== undefined) ? q.instruction : COMMON_INSTRUCTION;
    questionInstruction.textContent = instr ? ("※ " + instr) : "";
    questionInstruction.style.display = instr ? "" : "none";
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
  renderAnswerFields(qid);            // 좌측 답안 필드(문항별) 렌더 + 값 복원
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

  // 문항 이동 시 항상 맨 위부터 보이도록
  window.scrollTo(0, 0);
  const qbox = document.querySelector(".question-box");
  if (qbox) qbox.scrollTop = 0;
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
  if (!a) return false;
  return getAnswerFields(qid).some((f) => a[f.key] && String(a[f.key]).trim());
}

/* ============================================================
 *  답안 저장/복원
 * ============================================================ */
function saveCurrentToMemory() {
  const a = answers[current] = answers[current] || {};
  collectAnswerFields();              // 좌측 답안 필드들(문항별)
  a.aiPrompt = aiPrompt.value;        // 우측 프롬프트 입력
  a.aiResult = aiResult.textContent;  // 우측 AI 응답 결과(텍스트)
  playgroundImages[current] = aiImages.innerHTML; // 우측 이미지 결과(세션 한정)
}
function persist() {
  saveCurrentToMemory(); // 메모리에만 보존 (localStorage 미사용 → 새로고침 시 초기화)
}
/* 문항별 좌측 답안 필드 렌더링 + 값 복원 */
function renderAnswerFields(qid) {
  const fields = getAnswerFields(qid);
  const a = answers[qid] || {};
  answerFields.innerHTML = "";
  fields.forEach((f) => {
    const block = document.createElement("div");
    block.className = "answer-block";
    const req = f.required ? ' <span class="required">[필수]</span>' : "";
    const guide = f.guide ? `<div class="answer-guide">${escapeHtml(f.guide)}</div>` : "";
    if (f.type === "image") {
      block.innerHTML =
        `<div class="answer-label">${escapeHtml(f.label)}${req}</div>` + guide +
        `<input type="file" accept="image/*" class="answer-file" />` +
        `<div class="answer-image-preview"></div>`;
      const preview = block.querySelector(".answer-image-preview");
      if (a[f.key]) preview.innerHTML = `<img src="${a[f.key]}" alt="첨부 이미지" />`;
      block.querySelector(".answer-file").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          (answers[current] = answers[current] || {})[f.key] = reader.result;
          preview.innerHTML = `<img src="${reader.result}" alt="첨부 이미지" />`;
          updateActiveStates(current);
        };
        reader.readAsDataURL(file);
      });
    } else if (f.type === "choice") {
      block.innerHTML = `<div class="answer-label">${escapeHtml(f.label)}${req}</div>` + guide;
      const list = document.createElement("div");
      list.className = "choice-list";
      (f.options || []).forEach((opt) => {
        const lab = document.createElement("label");
        lab.className = "choice-option";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "choice-" + qid + "-" + f.key;
        radio.value = opt;
        if (a[f.key] === opt) { radio.checked = true; lab.classList.add("selected"); }
        radio.addEventListener("change", () => {
          (answers[current] = answers[current] || {})[f.key] = opt;
          list.querySelectorAll(".choice-option").forEach((el) => el.classList.remove("selected"));
          lab.classList.add("selected");
          updateActiveStates(current);
        });
        const span = document.createElement("span");
        span.textContent = opt;
        lab.appendChild(radio);
        lab.appendChild(span);
        list.appendChild(lab);
      });
      block.appendChild(list);
    } else {
      block.innerHTML =
        `<div class="answer-label">${escapeHtml(f.label)}${req}</div>` + guide +
        `<textarea class="answer-input" data-key="${f.key}" placeholder="${escapeHtml(f.placeholder || "")}"></textarea>`;
      const ta = block.querySelector("textarea");
      ta.value = a[f.key] || "";
      ta.addEventListener("input", () => { collectAnswerFields(); updateActiveStates(current); });
    }
    answerFields.appendChild(block);
  });
}

/* 현재 문항의 좌측 텍스트 필드 값을 메모리에 수집 */
function collectAnswerFields() {
  const a = answers[current] = answers[current] || {};
  getAnswerFields(current).forEach((f) => {
    if (f.type !== "text") return; // 이미지·객관식은 선택/첨부 시점에 저장됨
    const ta = answerFields.querySelector(`textarea[data-key="${f.key}"]`);
    if (ta) a[f.key] = ta.value;
  });
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
      if (!confirm("제출하시겠습니까?")) return; // 취소 시 그대로 유지
      persist(); // 현재 답안까지 메모리에 반영
      const done = QUESTION_ORDER.filter(isAnswered).length;
      copyToClipboard(buildAllAnswersText()).then(
        () => { alert(`제출이 완료되어 전체 답변이 클립보드에 복사되었습니다. (${done}/${QUESTION_ORDER.length} 작성)\n\n복사한 답변을 예시답안과 비교하여 직접 채점해 보세요!`); location.reload(); },
        () => { alert(`제출이 완료되었습니다. (${done}/${QUESTION_ORDER.length} 작성)\n\n작성한 답변을 예시답안과 비교하여 직접 채점해 보세요!\n(전체 답변 자동 복사에는 실패했습니다.)`); location.reload(); }
      );
      return; // 제출 후 location.reload()로 전체 초기화 (안내 화면 복귀)
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
    let fieldsHtml = "";
    getAnswerFields(qid).forEach((f) => {
      const v = a[f.key];
      if (f.type === "image") {
        fieldsHtml += `<div class="answer-field"><div class="answer-field-label">${escapeHtml(f.label)}</div>` +
          (v ? `<img class="answer-field-img" src="${v}" alt="첨부 이미지" />` : `<div class="answer-field-value empty">(미첨부)</div>`) + `</div>`;
      } else {
        const t = (v || "").trim();
        fieldsHtml += `<div class="answer-field"><div class="answer-field-label">${escapeHtml(f.label)}</div>` +
          `<div class="answer-field-value ${t ? "" : "empty"}">${t ? escapeHtml(v) : "(미작성)"}</div></div>`;
      }
    });
    const item = document.createElement("div");
    item.className = "answer-item";
    item.innerHTML =
      `<div class="answer-item-head">` +
        `<span class="answer-item-no">${escapeHtml(q.no || qid)}</span>` +
        `<span class="answer-item-title">${escapeHtml(q.title || "")}</span>` +
        `<span class="answer-badge ${done ? "done" : "todo"}">${done ? "작성완료" : "미작성"}</span>` +
      `</div>` + fieldsHtml +
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

/* 전체 답변을 텍스트로 구성 (제출 시 클립보드 복사용) */
function buildAllAnswersText() {
  const done = QUESTION_ORDER.filter(isAnswered).length;
  const lines = ["[AICE GENERATIVE 모의고사 - 전체 답변]", `(${done}/${QUESTION_ORDER.length} 작성)`, ""];
  QUESTION_ORDER.forEach((qid) => {
    const q = QUESTIONS[qid] || {};
    const a = answers[qid] || {};
    lines.push(`■ ${q.no || qid} ${q.title || ""} ${isAnswered(qid) ? "[작성완료]" : "[미작성]"}`);
    getAnswerFields(qid).forEach((f) => {
      const v = a[f.key];
      if (f.type === "image") {
        lines.push(`  · ${f.label}: ${v ? "(이미지 첨부됨)" : "(미첨부)"}`);
      } else {
        lines.push(`  · ${f.label}: ${(v || "").trim() || "(미작성)"}`);
      }
    });
    lines.push("");
  });
  return lines.join("\n");
}

/* 클립보드 복사 (Promise 반환, 구형 브라우저 폴백 포함) */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("copy failed"));
    } catch (e) { reject(e); }
  });
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
