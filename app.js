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

/* 프롬프트 작성형 문항 공통 '작성 과제' (각 지문 뒤에 붙임) */
const TASK_PROMPT =
`

**［ 작성 과제 ］**
위 지문을 바탕으로 생성형 AI에 입력할 프롬프트를 작성하시오.
답안은 반드시 다음 5개 항목으로 구분하여 작성하시오.
**# 역할   # 맥락   # 명령   # 형식   # 어조**

각 항목에는 다음 내용이 드러나도록 작성하시오.
• **역할**: AI가 어떤 전문가, 담당자, 분석가 또는 에이전트의 관점에서 답변해야 하는지 작성한다.
• **맥락**: 과제가 주어진 배경 상황, 회사·부서·문제 상황·업무 목적 등 필요한 정보를 작성한다.
• **명령**: AI가 실제로 수행해야 할 핵심 작업을 구체적으로 지시한다.
• **형식**: 결과물의 개수, 길이, 표 구성, 출력 순서 등 최종 출력 구조를 작성한다.
• **어조**: 결과물의 목적과 대상에 맞는 문체와 표현 방식을 작성한다.`;

/* 8번(AI 에이전트 시스템 프롬프트)용 '작성 과제' */
const TASK_AGENT =
`

**［ 작성 과제 ］**
위 지문을 바탕으로 AI 에이전트의 시스템 프롬프트를 작성하시오.
답안은 반드시 다음 5개 항목으로 구분하여 작성하시오.
**# 역할   # 맥락   # 명령   # 형식   # 어조**

각 항목에는 다음 내용이 드러나도록 작성하시오.
• **역할**: AI가 어떤 전문가, 담당자, 분석가 또는 에이전트의 관점에서 답변해야 하는지 작성한다.
• **맥락**: 과제가 주어진 배경 상황, 회사·부서·문제 상황·업무 목적 등 필요한 정보를 작성한다.
• **명령**: AI가 실제로 수행해야 할 핵심 작업을 구체적으로 지시한다.
• **형식**: 결과물의 개수, 길이, 표 구성, 출력 순서 등 최종 출력 구조를 작성한다.
• **어조**: 결과물의 목적과 대상에 맞는 문체와 표현 방식을 작성한다.`;

const QUESTIONS = {
  "A-Q1": {
    no: "1번", title: "제안서 핵심 메시지 작성 프롬프트",
    body:
`기업용 SaaS 솔루션 기업 **넥사플로우(NexaFlow)**는 전략 실행 관리 솔루션 **StrategicFlow**를 개발하여 대기업 및 중견기업을 대상으로 영업을 확대하고 있다. StrategicFlow는 조직의 KPI를 자동으로 수집하고 시각화하며, 부서별 전략 과제 진행률을 실시간으로 모니터링하고, 병목이 발생할 경우 자동 알림을 제공하는 기능을 갖춘 솔루션이다.

현재 **동서테크그룹**의 전략기획실은 전사 실행력을 높이기 위해 여러 관리 체계를 도입했지만, 여전히 각 부서의 KPI 달성 현황이 수기 보고 중심으로 취합되고 있다. 각 부서가 서로 다른 양식으로 전략 과제 진행률을 관리하고 있어, 경영진이 전사 차원의 실행 현황을 한눈에 파악하기 어렵다. 또한 주요 전략 과제에서 지연이나 병목이 발생해도 즉시 감지되지 않아, 월간 회의 이후에야 문제가 확인되는 경우가 반복되고 있다.

동서테크그룹 전략기획실의 **DX전략 담당자 박지훈 매니저**는 StrategicFlow 도입을 검토하고 있으며, 다음 주 경영진 회의에서 도입 필요성을 보고해야 한다. 보고서 첫 장에는 솔루션의 기능을 길게 나열하기보다, 현재 조직이 겪고 있는 실행 관리 문제와 StrategicFlow 도입을 통한 기대효과를 한눈에 전달할 수 있는 헤드라인 형태의 핵심 메시지가 필요하다.

박지훈 매니저는 생성형 AI를 활용하여 경영진 보고서 첫 장에 사용할 핵심 메시지 후보를 만들고자 한다. 이때 AI가 단순한 광고 문구를 만드는 것이 아니라, 동서테크그룹 내부의 실행 관리 문제를 이해하고, 경영진이 도입 필요성을 직관적으로 판단할 수 있는 메시지를 작성하도록 프롬프트를 구성해야 한다.

작성할 핵심 메시지에는 StrategicFlow의 주요 기능 중 2가지 이상이 반영되어야 한다. 활용할 수 있는 주요 기능은 다음과 같다.
• 조직 KPI 자동 수집·시각화
• 부서별 전략 과제 진행률 실시간 모니터링
• 병목 발생 시 자동 알림 제공

또한 핵심 메시지는 동서테크그룹이 현재 겪고 있는 수기 보고, 부서별 관리 양식 차이, 병목 대응 지연 등의 문제와 StrategicFlow 도입 후 기대효과가 함께 드러나도록 작성되어야 한다. 단, "모든 전략 목표 100% 달성", "조직 문제 완전 해결", "도입 즉시 성과 극대화"처럼 과장되거나 허위 효능으로 보일 수 있는 표현은 사용하지 않아야 한다.

최종 결과물은 조건에 맞는 핵심 메시지 3개와 각 메시지의 핵심 포인트 설명으로 구성되어야 한다. 핵심 메시지는 1~2문장, 50자 내외로 간결하게 작성되어야 하며, 경영진 보고용으로 적합한 격식 있고 신뢰감 있는 어조를 유지해야 한다.${TASK_PROMPT}`,
  },
  "A-Q2": {
    no: "2번", title: "고객 응대 문구 개선 프롬프트",
    body:
`온라인 직무교육 플랫폼 **런업클래스(RunUp Class)**는 직장인을 대상으로 데이터 분석, 생성형 AI, 업무 자동화 등 실무 중심 온라인 강의를 제공하고 있다. 런업클래스는 바쁜 직장인들이 짧은 시간 안에 업무에 바로 적용할 수 있는 교육 콘텐츠를 제공하는 것을 주요 강점으로 내세우고 있다.

최근 런업클래스는 신규 과정인 **"생성형 AI 업무 활용 입문 패키지"**를 출시했으며, 사전 신청 고객에게는 7일간 무료로 강의를 체험할 수 있는 혜택을 제공했다. 무료 체험은 신규 고객이 강의 품질과 학습 환경을 직접 경험하고, 이후 유료 전환 여부를 판단하는 중요한 첫 접점이다.

하지만 일부 고객이 무료 체험 신청 후 강의 접속 방법을 제대로 확인하지 못해 불편을 겪고 있다. 고객 중 한 명은 "무료 체험이라고 해서 신청했는데 강의가 열리지 않는다. 결제 유도만 하는 것 아니냐"며 고객센터에 강한 불만을 남겼다.

실제로는 무료 체험 신청 후 발송되는 안내 메일에서 수강 시작 버튼을 눌러야 강의실이 활성화되는 구조였다. 그러나 안내 문구가 충분히 명확하지 않아 고객이 혼란을 느낀 상황이며, 이 문제를 제대로 응대하지 못할 경우 무료 체험 고객의 서비스 신뢰도 저하로 이어질 수 있다.

런업클래스 **CS 운영 담당자**는 고객에게 보낼 답변 문구를 작성해야 한다. 답변에는 고객이 불편을 겪은 점에 대한 사과, 강의실 활성화 방법 안내, 추가 도움이 필요한 경우 고객센터가 지원하겠다는 내용이 포함되어야 한다. 단, 고객의 불만을 가볍게 여기거나 "안내 메일을 확인하지 않은 고객 책임"처럼 보이는 표현은 피해야 한다.

최종 결과물은 문자 또는 카카오톡으로 보낼 수 있는 **고객 응대 문구 2가지 버전**으로 작성되어야 한다. 하나는 기본 안내형, 다른 하나는 조금 더 공감이 강조된 문구로 작성되어야 한다. 각 문구는 너무 길지 않게 5~7문장 이내로 작성하며, 정중하고 친절한 어조를 유지해야 한다.${TASK_PROMPT}`,
  },
  "B-Q1": {
    no: "3번", title: "생성형 AI 이미지 제작 프롬프트 작성",
    dualModel: true, // LLM(이미지 프롬프트 작성) + 이미지 생성 모델 둘 다 사용
    answerFields: [
      { key: "q1", label: "Q-1. 이미지 생성 프롬프트를 작성하기 위한 요청문", required: true, guide: "(프롬프트 제출) AI에게 이미지 생성 프롬프트를 만들어 달라고 요청한 프롬프트", placeholder: "이미지 생성 프롬프트 작성 요청문", type: "text" },
      { key: "q2", label: "Q-2. 이미지 생성 프롬프트", required: true, guide: "(Q-1로 생성된 프롬프트 및 이미지 생성에 실제 사용한 프롬프트)", placeholder: "이미지 생성 프롬프트", type: "text" },
      { key: "q3", label: "Q-3. 이미지 첨부", required: true, guide: "생성한 이미지를 첨부하세요", type: "image" },
    ],
    body:
`통신·플랫폼 기업 **온링크커넥트(OnLink Connect)**는 기업 고객을 대상으로 클라우드, 네트워크, 데이터 플랫폼, AI 자동화 솔루션을 제공하고 있다. 온링크커넥트는 여러 산업의 기업 고객이 디지털 전환을 추진할 때 필요한 기술 인프라와 AI 기반 업무 자동화 환경을 제공하는 B2B 기술 기업이다.

온링크커넥트는 다음 분기 전략 발표회에서 자사의 새로운 브랜드 방향을 **"AI 기반 B2B 디지털 전환 파트너"**로 제시할 예정이다. 이번 발표는 임직원과 주요 파트너사를 대상으로 진행되며, 발표 첫 장의 비전 이미지는 새로운 브랜드 방향을 직관적으로 전달하는 역할을 해야 한다.

**브랜드전략 담당자 정하윤 매니저**는 발표 첫 장에 사용할 비전 이미지를 생성형 AI 이미지 도구로 제작하려고 한다. 이미지는 단순한 기술 이미지가 아니라, 온링크커넥트가 기업의 디지털 전환을 연결하고 지원하는 파트너라는 인상을 전달해야 한다.

이미지에는 스마트 팩토리, 금융, 물류, 헬스케어 등 다양한 산업을 상징하는 요소가 포함되어야 하며, 중앙에는 AI 코어 또는 데이터 허브처럼 보이는 시각 요소가 배치되어야 한다. 이를 통해 온링크커넥트가 여러 산업의 데이터를 연결하고, AI를 기반으로 기업 고객의 전환 과정을 지원한다는 메시지가 드러나야 한다.

전체 이미지는 미래지향적이면서도 신뢰감 있는 분위기여야 한다. 어둡고 위협적인 사이버 보안 이미지나 지나치게 복잡한 회로도 이미지는 피해야 한다. 또한 발표 슬라이드 상단 또는 좌측에 제목을 넣을 수 있도록 여백이 확보되어야 하며, 화면 비율은 16:9로 제작되어야 한다.

이미지 제작 프롬프트는 **CAST 프레임워크**를 반영하여 작성해야 한다. CAST 프레임워크란 이미지 생성 프롬프트를 구성할 때 다음 4가지 요소를 고려하는 방식이다.
• **Content**: 이미지에 포함될 핵심 대상, 배경, 상징 요소
• **Action/Atmosphere**: 장면의 분위기, 흐름, 감정
• **Style**: 이미지의 시각적 스타일, 디자인 방향, 색감
• **Technical Specs**: 화면 비율, 구도, 여백, 해상도 등 기술 조건

**［ 작성 과제 ］**
위 지문을 바탕으로 **이미지 생성 프롬프트를 작성하기 위한 요청문**을 작성하시오.
답안은 반드시 다음 5개 항목으로 구분하여 작성하시오.
**# 역할   # 맥락   # 명령   # 형식   # 어조**

각 항목에는 다음 내용이 드러나도록 작성하시오.
• **역할**: AI가 어떤 전문가, 담당자, 분석가 또는 에이전트의 관점에서 답변해야 하는지 작성한다.
• **맥락**: 과제가 주어진 배경 상황, 회사·부서·문제 상황·업무 목적 등 필요한 정보를 작성한다.
• **명령**: AI가 실제로 수행해야 할 핵심 작업을 구체적으로 지시한다.
• **형식**: 결과물의 개수, 길이, 표 구성, 출력 순서 등 최종 출력 구조를 작성한다.
• **어조**: 결과물의 목적과 대상에 맞는 문체와 표현 방식을 작성한다.

작성한 요청문을 바탕으로 **CAST 프레임워크가 반영된 실제 이미지 생성 프롬프트**를 작성하고, 해당 프롬프트로 생성한 이미지를 첨부하시오.`,
  },
  "C-Q1": {
    no: "4번", title: "디지털 헬스케어 경쟁사 제휴 현황 조사 프롬프트",
    body:
`디지털 헬스케어 스타트업 **메디핏랩스(MediFit Labs)**는 만성질환 관리 앱과 웨어러블 기기 연동 서비스를 제공하고 있다. 사용자는 앱을 통해 건강 데이터를 기록하고, 웨어러블 기기에서 수집된 활동량, 심박, 수면 등의 데이터를 기반으로 건강 관리 리포트를 확인할 수 있다.

최근 디지털 헬스케어 시장에서는 기술력만으로 서비스를 확장하기보다, 병원, 보험사, 제약사, 웨어러블 기업과의 제휴를 통해 서비스 신뢰도를 높이고 고객 접점을 확대하는 사례가 늘어나고 있다. 특히 만성질환 관리나 원격 건강관리 서비스는 의료기관, 보험사, 디바이스 기업과의 협력이 서비스 확장에 중요한 영향을 미친다.

메디핏랩스는 향후 자사 서비스의 신뢰도와 활용 범위를 높이기 위해 외부 파트너십 전략을 검토하고 있다. 이를 위해 국내외 디지털 헬스케어 기업들이 어떤 파트너와 제휴하고 있으며, 그 제휴가 서비스 운영과 사업 확장에 어떤 영향을 주었는지 파악할 필요가 있다.

**파트너십 전략 담당자 강민수 대리**는 자사의 향후 제휴 전략을 수립하기 위해 주요 경쟁사의 파트너십 사례를 조사해야 한다. 조사 대상은 디지털 헬스케어 또는 원격진료, 웨어러블 건강관리, 만성질환 관리 영역에서 활동하는 국내외 기업 4개 이상이다.

조사 내용에는 각 기업의 주요 제휴 파트너, 제휴 목적, 서비스 또는 사업에 미친 영향, 메디핏랩스가 참고할 수 있는 시사점이 포함되어야 한다. 자료는 가능한 한 공식 보도자료, 기업 홈페이지, 공시자료, 신뢰도 높은 산업 리포트 등을 우선 활용해야 하며, 출처가 불분명한 블로그나 개인 의견 중심 자료는 피해야 한다.

최종 결과물은 경쟁사별 비교표와 핵심 인사이트 요약으로 구성되어야 한다. 표에는 기업명, 주요 제휴 파트너, 제휴 목적, 서비스 또는 사업 영향, 전략적 의미, 참고 출처가 포함되어야 한다. 어조는 내부 전략 검토 보고서에 적합하도록 객관적이고 분석적으로 작성되어야 한다.${TASK_PROMPT}`,
  },
  "C-Q2": {
    no: "5번", title: "글로벌 AI 교육 플랫폼 시장 조사 프롬프트",
    body:
`AI 기반 교육 서비스 기업 **에듀브릿지AI(EduBridge AI)**는 성인 직장인을 대상으로 생성형 AI 활용 교육, 직무별 AI 튜터, 실습형 온라인 코스를 제공하는 신규 서비스를 기획하고 있다. 에듀브릿지AI는 기존의 단순 강의형 온라인 교육을 넘어, 학습자가 자신의 직무 상황에 맞게 AI를 활용하고 실습할 수 있는 서비스를 만들고자 한다.

최근 글로벌 교육 시장에서는 Coursera, Udemy, Khan Academy, Duolingo, LinkedIn Learning 등 여러 교육 플랫폼이 AI 기능을 도입하며 학습 추천, 개인화 피드백, AI 튜터, 자동 평가 기능을 강화하고 있다. 특히 성인 직장인 대상 교육에서는 학습자의 목표, 직무, 학습 속도에 맞춘 개인화 기능이 중요한 경쟁 요소로 떠오르고 있다.

에듀브릿지AI는 신규 서비스를 기획하기 전, 글로벌 AI 교육 플랫폼들이 어떤 AI 기능을 제공하고 있으며, 어떤 방식으로 수익 모델과 차별화 전략을 구성하고 있는지 조사할 필요가 있다. 단순히 플랫폼을 소개하는 수준이 아니라, 에듀브릿지AI가 실제 서비스 기획에 참고할 수 있는 기능과 전략을 도출하는 것이 중요하다.

**AI서비스 기획 담당자 최유진 매니저**는 글로벌 AI 교육 플랫폼의 서비스 전략을 조사하여 신규 서비스 기획에 참고하려고 한다. 조사 대상은 AI 기반 학습 기능을 제공하거나, 기존 교육 서비스에 생성형 AI 기능을 접목한 해외 교육 플랫폼 4개 이상이다.

조사 내용에는 각 플랫폼의 주요 AI 기능, 대상 학습자, 수익 모델, 차별화 요소, 에듀브릿지AI가 참고할 수 있는 서비스 기획 시사점이 포함되어야 한다. 자료는 기업 공식 홈페이지, 공식 블로그, 보도자료, 신뢰도 높은 교육·기술 매체를 중심으로 수집해야 한다.

최종 결과물은 플랫폼별 비교표와 에듀브릿지AI의 신규 서비스 기획에 참고할 수 있는 시사점으로 구성되어야 한다. 단순 소개가 아니라, "어떤 기능을 참고할 수 있는지", "어떤 차별화 전략이 필요한지"가 드러나야 한다. 어조는 서비스 기획 회의에서 활용할 수 있도록 실무적이고 분석적으로 작성되어야 한다.${TASK_PROMPT}`,
  },
  "D-Q1": {
    no: "6번", title: "연간매출액 영향 요인 상관분석 프롬프트",
    file: { name: "corr_data.xlsx", url: "data/corr_data.xlsx" },
    body:
`교육 서비스 기업 **케이러닝그룹(K-Learning Group)**은 여러 교육 사업부를 운영하고 있으며, 사업부별 매출에 영향을 주는 주요 요인을 파악하려고 한다. 케이러닝그룹은 각 사업부의 수강생 수, 마케팅비, 보유 콘텐츠 수, 평균 수강료, 강사 평균 경력, 운영 연수 등 다양한 지표를 관리하고 있다.

최근 케이러닝그룹은 사업부별 매출 차이가 커지고 있어, 어떤 운영 지표가 연간매출액과 가장 밀접하게 관련되어 있는지 확인하고자 한다. 분석 결과는 향후 마케팅 예산 배분, 콘텐츠 확충, 강사 운영 전략, 사업부 성장 전략을 수립하는 데 참고 자료로 활용될 예정이다.

**데이터 분석 담당자 윤태호 사원**은 각 사업부의 연간매출액과 여러 운영 지표 간의 관계를 분석해야 한다. 이를 위해 제공된 데이터 파일(corr_data.xlsx)을 활용하여 연간매출액과 각 변수 간의 피어슨 상관계수를 계산하려고 한다.

제공된 데이터 파일(corr_data.xlsx)에는 사업부별 연간매출액과 관련 변수들이 포함되어 있다. 분석 대상 변수는 다음과 같다.
• annual_sales: 연간매출액
• student_count: 수강생 수
• mkt_spend: 마케팅비
• content_count: 보유 콘텐츠 수
• avg_price: 평균 수강료
• instructor_exp_years: 강사 평균 경력
• operating_years: 운영 연수

윤태호 사원은 annual_sales와 나머지 변수들 간의 피어슨 상관계수를 계산하여, 연간매출액과 가장 관련성이 높은 변수를 찾아야 한다. 분석 결과는 보고서에 붙여 넣기 쉽도록 간단한 표로 정리되어야 하며, 마지막에는 가장 높은 상관관계를 보인 변수명과 상관계수를 한 줄로 제시해야 한다.

상관계수는 소수점 둘째 자리까지 반올림해야 하며, 최종 답안은 변수명,상관계수 형식으로 작성되어야 한다. 예를 들어 마케팅비의 상관계수가 0.86으로 가장 높다면 mkt_spend,0.86과 같이 작성한다.${TASK_PROMPT}`,
  },
  "D-Q2": {
    no: "7번", title: "수강생수 데이터 전처리 및 평균 산출 프롬프트",
    file: { name: "preprocess_data.xlsx", url: "data/preprocess_data.xlsx" },
    body:
`온라인 교육 기업 **케이에듀링크(KEdulink)**는 월별 수강생 수 데이터를 관리하고 있다. 케이에듀링크는 여러 지점과 과정에서 발생하는 수강생 수 데이터를 취합하여 교육 운영 현황을 파악하고, 과정별 수요 예측과 강사 배정 계획을 세우는 데 활용하고 있다.

**데이터 운영 담당자 한서진 주임**은 분석 보고서를 작성하기 전, 수강생수 데이터에 포함된 결측값과 이상값을 처리해야 한다. 수강생수 데이터가 잘못 정리되면 평균 수강생수 산출 결과가 왜곡될 수 있고, 이후 운영 인력 배치나 과정 개설 판단에도 영향을 줄 수 있다.

제공된 데이터 파일(preprocess_data.xlsx)에는 여러 지점 또는 과정의 수강생수 데이터가 포함되어 있다. 일부 값에는 문자, 단위, 기호가 섞여 있으며, 일부 행에는 결측값이 존재한다. 또한 일반적인 범위에서 크게 벗어나는 이상값도 포함되어 있다.

한서진 주임은 먼저 수강생수 데이터에서 문자, 단위, 기호를 제거하여 숫자형 데이터로 변환해야 한다. 이후 결측값을 제외한 상태에서 Tukey 방식으로 Q1과 Q3를 계산하고, IQR을 활용하여 이상값을 식별해야 한다. 이상값 기준은 Q1 − 1.5 × IQR 미만 또는 Q3 + 1.5 × IQR 초과인 값이다.

Tukey 방식에서는 데이터를 정렬한 뒤 하위 50%의 중앙값을 Q1, 상위 50%의 중앙값을 Q3로 사용한다. 데이터 개수가 홀수인 경우 전체 중앙값인 Q2는 제외하고 Q1과 Q3를 계산한다.

이상값을 식별한 후에는 이상값을 제외한 정상 데이터의 중앙값을 계산한다. 이후 결측값과 이상값은 모두 해당 중앙값으로 대체한다. 전처리가 완료되면 전체 수강생수 평균을 계산해야 하며, 평균값이 소수로 나올 경우 ROUND HALF UP 방식으로 정수 반올림해야 한다.

최종 결과물에는 결측값이 있었던 행 번호, 이상값으로 판단된 행 번호, 대체에 사용한 중앙값, 전처리 후 전체 평균 수강생수가 포함되어야 한다.${TASK_PROMPT}`,
  },
  "E-Q1": {
    no: "8번", title: "주간 시장 분석 보고서 자동화 AI 에이전트 시스템 프롬프트",
    noAI: true, // AI 모델을 사용하지 않고, 작성한 프롬프트만 제출하는 문항
    noAIHint: "📝 <strong>이 문항은 AI 모델을 사용하지 않습니다.</strong> 우측 AI 플레이그라운드는 비활성화되며, 좌측 <strong>‘프롬프트 입력’</strong>란에 직접 작성한 시스템 프롬프트를 입력한 뒤 제출하세요.",
    answerFields: [
      { key: "prompt", label: "프롬프트 입력", required: true, guide: "※ 작성 과제에 따라 직접 작성한 AI 에이전트 시스템 프롬프트를 입력하세요", placeholder: "AI 에이전트 시스템 프롬프트 입력", type: "text" },
    ],
    body:
`산업 자동화 솔루션 기업 **로보인사이트(RoboInsight)**는 산업용 로봇, 자동화 설비, AI 기반 공정 분석 솔루션을 제공하고 있다. 로보인사이트는 제조기업의 생산 효율을 높이고, 공정 데이터를 분석하여 자동화 수준을 개선하는 솔루션을 제공하는 기업이다.

로보인사이트 전략기획팀은 매주 산업 뉴스, 경쟁사 보도자료, 투자 동향, 정부 정책 발표, 고객 산업별 기술 트렌드를 확인하여 주간 시장 분석 보고서 초안을 작성하고 있다. 이 보고서는 경영진 회의와 사업 전략 검토 회의에서 시장 변화와 경쟁사 움직임을 파악하는 참고 자료로 활용된다.

**시장분석 담당자 오현우 대리**는 매주 여러 사이트를 직접 확인하며 자료를 수집하고 있지만, 수작업에 시간이 많이 걸리고 자료 선별 기준도 일정하지 않다. 또한 수집한 자료 중 어떤 내용을 보고서에 우선 반영해야 하는지 판단하는 데 시간이 오래 걸린다.

로보인사이트는 이 업무를 자동화하기 위해 **AI 리서치 에이전트**를 만들고자 한다. 이 에이전트는 외부 시장 동향을 수집하고, 경쟁사 관련 자료를 선별하며, 데이터가 정상적인지 확인하고, 핵심 시장 이슈와 경쟁사 전략을 요약해야 한다. 또한 요약 내용이 보고서에 적합한지 점검한 뒤, 전략기획팀이 검토할 수 있는 주간 시장 분석 보고서 초안을 작성해야 한다.

이 문제에서 작성해야 하는 프롬프트는 AI에게 "프롬프트를 만들어달라"고 요청하는 문장이 아니라, AI 에이전트의 시스템 프롬프트로 바로 사용할 수 있는 형태여야 한다. 즉, AI 에이전트가 어떤 역할을 수행하고, 어떤 기준으로 자료를 선별하며, 어떤 순서로 보고서를 작성해야 하는지 직접 정의해야 한다.

최종 시스템 프롬프트에는 자료 수집 대상, 경쟁사 자료 선별 기준, 데이터 정상 여부 확인 기준, 핵심 이슈 요약 기준, 보고서 초안 구성 항목이 포함되어야 한다. 보고서 초안 구성 항목은 자료 수집 결과, 선별된 경쟁사 자료, 데이터 정상 여부 확인 결과, 핵심 시장 이슈 요약, 보고서 반영 필요 사항을 포함해야 한다. 어조는 전략기획팀 내부 보고서에 적합하도록 객관적이고 분석적이어야 한다.${TASK_AGENT}`,
  },
  "E-Q2": {
    no: "9번", title: "이메일 마케팅 자동화 플로우 예외 상황 처리",
    noAI: true, // 객관식 문항 — AI 모델 미사용, 보기 선택만 제출
    noAIHint: "📝 <strong>이 문항은 객관식 문항입니다.</strong> AI 모델을 사용하지 않으며 우측 AI 플레이그라운드는 비활성화됩니다. 좌측 보기에서 <strong>정답을 선택</strong>한 뒤 제출하세요.",
    instruction: "", // 본문 마지막 발문이 지시 역할 → 별도 ※ 지시문 미표시
    // 정답: ② ('반려' → Gmail 발송 중단 → 반려 상태·사유 기록 → 담당자 수정 또는 재생성 대기)
    answerFields: [
      { key: "answer", label: "정답 선택", required: true, type: "choice", options: [
        "① 검토 결과 확인 → '반려' 여부 판단 → Gmail 발송 실행 → 발송 결과 기록 → 담당자에게 수정 요청",
        "② 검토 결과 확인 → '반려' 여부 판단 → Gmail 발송 중단 → Google Sheets에 반려 상태 및 사유 기록 → 담당자 수정 또는 재생성 대기",
        "③ Gmail 발송 실행 → 검토 결과 확인 → '반려' 여부 판단 → Google Sheets에 발송 성공 기록 → 담당자 수정 요청",
        "④ 검토 결과 확인 → '반려' 여부 판단 → Google Sheets에서 고객 정보 삭제 → Gmail 발송 중단 → 리포트 업데이트 생략",
        "⑤ 초안 재생성 → Gmail 발송 실행 → 담당자 검토 → Google Sheets에 반려 상태 기록 → 발송 결과 리포트 업데이트",
      ] },
    ],
    body:
`건강기능식품 브랜드 **바이탈그린(VitalGreen)**은 신제품 **슬립밸런스** 출시를 앞두고 기존 고객 정보를 활용하여 Power Automate 기반의 이메일 마케팅 자동화 플로우를 구축하였다. 바이탈그린은 고객 유형에 따라 신제품 안내 문구를 다르게 구성하여 이메일 마케팅의 반응률을 높이고자 한다.

해당 자동화 시스템은 Google Sheets에 저장된 고객 정보를 읽어오고, OpenAI API(ChatGPT)를 활용하여 고객 유형에 맞는 이메일 본문 초안을 생성하도록 설계되었다. 이후 생성된 초안은 Google Sheets의 '초안' 컬럼에 저장되고, 담당자가 검토한 뒤 승인된 건에 한해 Gmail로 자동 발송된다.

이메일 마케팅 자동화는 반복 업무를 줄이고 고객별 맞춤형 메시지를 빠르게 생성할 수 있다는 장점이 있다. 하지만 검토가 제대로 이루어지지 않거나 반려된 초안이 잘못 발송될 경우, 부적절한 표현이 고객에게 전달되어 브랜드 신뢰도에 영향을 줄 수 있다. 따라서 승인과 반려 상태를 정확히 구분하고, 예외 상황에서 발송을 중단하는 처리가 중요하다.

해당 자동화 시스템의 정상 작동 프로세스는 다음과 같다.
1. **데이터 수집**: Google Sheets에서 고객 정보인 고객명, 이메일, 고객 유형 등을 읽어온다.
2. **초안 생성**: OpenAI API(ChatGPT) 연동을 통해 고객 유형에 맞는 이메일 본문 초안을 자동 생성한다.
3. **초안 저장**: 생성된 이메일 초안을 Google Sheets의 '초안' 컬럼에 업데이트한다.
4. **담당자 검토**: CRM 캠페인 담당자 김도윤 주임이 초안을 확인하고 검토 결과를 '승인' 또는 '반려'로 변경한다.
5. **이메일 발송**: 검토 결과가 '승인'인 건에 한해 Gmail을 통해 고객에게 이메일을 자동 발송한다.
6. **결과 기록**: 발송 완료 후 발송 일시, 성공 여부 등을 Google Sheets에 기록하고 리포트를 업데이트한다.

김도윤 주임이 생성된 이메일 초안을 검토하던 중, 특정 고객의 초안에 부적절한 단어가 포함되어 있어 검토 결과를 **'반려'**로 선택한 상황이 발생했다.

바이탈그린의 시스템 설계상, '반려'된 건은 고객에게 메일이 발송되지 않아야 하며, 담당자가 내용을 수정하거나 재생성할 수 있도록 상태가 기록되어야 한다.

**※ 위 상황에서 Power Automate 플로우가 처리해야 할 올바른 작동 순서를 고르시오.**`,
  },
};

/* 작성 과제는 각 문항 본문(지문 뒤 TASK_PROMPT/TASK_AGENT)에 직접 표기 → 별도 공통 지시문 미사용 */
const COMMON_INSTRUCTION = "";

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
const IMG_LABEL = { dalle3: "OpenAI (gpt-image-1)", nanobanana: "Google (Nano Banana)" };

/* 이미지 생성 모델만 사용하는 문항 (B-Q1은 dualModel로 LLM+이미지 둘 다 사용 → 제외) */
const IMAGE_QUESTIONS = new Set();

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
const AUTH_KEY = "aice_gen_token";
let authToken = (() => { try { return sessionStorage.getItem(AUTH_KEY) || null; } catch (e) { return null; } })();
let submitted = false; // 중복 제출 방지(수동/자동)

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
  bindLogin();
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

/* ---------- 로그인 (공용 비밀번호, 서버 인증) ---------- */
function showLogin() {
  const s = $("#loginScreen");
  if (s) { s.hidden = false; const i = $("#loginPassword"); if (i) setTimeout(() => i.focus(), 0); }
}
function hideLogin() { const s = $("#loginScreen"); if (s) s.hidden = true; }

async function bindLogin() {
  const form = $("#loginForm");
  const pwInput = $("#loginPassword");
  const errEl = $("#loginError");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        const res = await fetch("/api/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pwInput.value }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          authToken = data.token || null;
          try { if (authToken) sessionStorage.setItem(AUTH_KEY, authToken); } catch (e) {}
          hideLogin();
        } else {
          errEl.textContent = data.error || "로그인에 실패했습니다.";
          pwInput.value = ""; pwInput.focus();
        }
      } catch (err) {
        errEl.textContent = "서버에 연결할 수 없습니다.";
      } finally {
        btn.disabled = false;
      }
    });
  }
  // 이미 토큰이 있으면 통과(만료 시 API 호출에서 재로그인 유도)
  if (authToken) { hideLogin(); return; }
  // 토큰 없음 → 인증 필요 여부 확인
  try {
    const h = await (await fetch("/api/health")).json();
    if (!h.authRequired) { hideLogin(); return; } // 인증 비활성(공개) → 통과
  } catch (e) { /* health 실패 시 로그인 화면 유지 */ }
  showLogin();
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
      submitExam(false);
      return;
    }
    loadQuestion(QUESTION_ORDER[idx + 1]);
  });
  $("#copyPromptBtn").addEventListener("click", () => copyText(aiPrompt.value, "프롬프트를 복사했습니다."));
  $("#llmLogBtn").addEventListener("click", showLog);
  $("#submitBtn").addEventListener("click", runAI);
  // 모델 라디오: 두 모델 문항에서 한 그룹 선택 시 다른 그룹 자동 해제 + 버튼명 전환
  document.querySelectorAll('input[name="llm"], input[name="img"]').forEach((r) =>
    r.addEventListener("change", onModelRadioChange)
  );
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

/* AI 미사용 문항: 우측 플레이그라운드(모델/프롬프트/결과) 전체 활성·비활성 토글 */
function setPlaygroundDisabled(disabled) {
  const rp = document.querySelector(".right-panel");
  if (rp) rp.classList.toggle("playground-disabled", disabled);
  ["#aiPrompt", "#submitBtn", "#copyPromptBtn", "#llmLogBtn", "#copyAnsBtn"].forEach((sel) => {
    const el = $(sel);
    if (el) el.disabled = disabled;
  });
}

/* 두 모델 문항: 현재 선택(이미지 모델 선택 여부)에 맞춰 제출 버튼명 전환 */
function updateDualSubmit() {
  submitBtn.textContent = selectedImage() ? "▶ 이미지 생성" : "▶ 입력";
}

/* 모델 라디오 변경: 두 모델 문항에서 한 그룹 선택 시 다른 그룹 해제 + 버튼명 전환 */
function onModelRadioChange(e) {
  const q = QUESTIONS[current] || {};
  if (!q.dualModel) return; // 단일 모델 문항은 기존 동작 유지
  const other = e.target.name === "llm" ? "img" : "llm";
  document.querySelectorAll('input[name="' + other + '"]').forEach((r) => { r.checked = false; });
  updateDualSubmit();
}

/* 현재 문항 유형에 맞춰 모델 영역을 활성/비활성하고 버튼·결과 영역을 전환 */
function applyQuestionMode() {
  const q = QUESTIONS[current] || {};
  const noAI = !!q.noAI;
  const dual = !noAI && !!q.dualModel;
  const imgMode = !noAI && !dual && isImageQuestion(current);
  const llmBox = $("#llmBox");
  const imgBox = $("#imgBox");
  const hint = $("#modeHint");

  // AI 미사용 문항: 우측 플레이그라운드 전체 비활성화 + 안내문구만 표시
  setPlaygroundDisabled(noAI);
  if (noAI) {
    if (llmBox) llmBox.disabled = true;
    if (imgBox) imgBox.disabled = true;
    submitBtn.textContent = "▶ 입력"; // 이전 문항(이미지) 버튼 텍스트 누수 방지
    aiResult.style.display = "";
    aiImages.style.display = "none";
    aiImages.innerHTML = "";
    if (hint) {
      hint.classList.add("mode-hint-notice");
      hint.innerHTML = (QUESTIONS[current] && QUESTIONS[current].noAIHint) ||
        "📝 <strong>이 문항은 AI 모델을 사용하지 않습니다.</strong> 우측 AI 플레이그라운드는 비활성화됩니다. 좌측 답안란에서 답안을 작성·선택한 뒤 제출하세요.";
    }
    return;
  }
  if (hint) hint.classList.remove("mode-hint-notice");

  // 두 모델(LLM+이미지) 모두 사용하는 문항(B-Q1)
  if (dual) {
    if (llmBox) llmBox.disabled = false;
    if (imgBox) imgBox.disabled = false;
    aiResult.style.display = "";   // LLM 텍스트 결과
    aiImages.style.display = "";   // 이미지 결과 (둘 다 표시)
    updateDualSubmit();            // 선택된 모델에 맞춰 ▶ 버튼명 전환
    if (hint) hint.textContent = "💡 LLM 모델로 이미지 생성 프롬프트를 만들고, 이미지 생성 모델로 이미지를 생성하세요. 사용할 모델을 선택해 실행합니다.";
    return;
  }

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
  if (QUESTIONS[current] && QUESTIONS[current].noAI) return; // AI 미사용 문항
  const prompt = aiPrompt.value.trim();
  if (!prompt) { toast("프롬프트를 입력하세요."); return; }

  setBusy(true);
  try {
    const useImage = (QUESTIONS[current] && QUESTIONS[current].dualModel)
      ? !!selectedImage()            // 두 모델 문항: 이미지 모델 선택 시 이미지 생성
      : isImageQuestion(current);
    if (useImage) await generateImage(selectedImage(), prompt);
    else          await generateText(prompt);
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
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = "Bearer " + authToken;
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch (e) {
    throw new Error("서버에 연결할 수 없습니다. (node server.js 실행 여부 확인)");
  }
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (res.status === 401) { // 인증 만료/누락 → 재로그인
    authToken = null;
    try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
    showLogin();
    throw new Error(data.error || "인증이 필요합니다. 다시 로그인하세요.");
  }
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

/* 시험 제출 — 수동(확인창) / 자동(시간 종료 시 강제). 중복 제출 방지. */
function submitExam(auto) {
  if (submitted) return;
  if (!auto && !confirm("제출하시겠습니까?")) return; // 수동 제출만 확인창
  submitted = true;
  persist(); // 현재 답안까지 메모리에 반영
  const done = QUESTION_ORDER.filter(isAnswered).length;
  const head = auto
    ? `시험 시간이 종료되어 자동 제출되었습니다. (${done}/${QUESTION_ORDER.length} 작성)`
    : `제출이 완료되었습니다. (${done}/${QUESTION_ORDER.length} 작성)`;
  copyToClipboard(buildAllAnswersText()).then(
    () => { // 복사 성공 → 안내 후 초기화
      alert(`${head}\n\n작성하신 전체 답변이 클립보드에 복사되었습니다.\n복사한 답변을 예시답안과 비교하여 직접 채점해 보세요!`);
      location.reload();
    },
    () => { // 복사 실패(자동 제출은 사용자 동작이 없어 차단될 수 있음) → 전체 답변 보기로 직접 복사 유도
      showAllAnswers();
      alert(`${head}\n\n클립보드 자동 복사에 실패했습니다.\n'전체 답변 보기' 창에서 답변을 직접 복사한 뒤, 페이지를 새로고침(F5)하면 처음 화면으로 초기화됩니다.`);
    }
  );
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
      submitExam(true); // 시간 종료 → 자동 제출
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
