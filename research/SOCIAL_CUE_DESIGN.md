# 소셜 큐 코칭을 SAIL에 붙이기 — 설계 (OpenAlex 접지)

**한 줄:** SRL의 *사회적 팔*(Bandura 사회인지 모델링/대리경험)을 앱에 더한다. T1이 환경 항을 계측했듯, 이건 앱이 비워둔 사회 항이다. 단 **전략을 모델링하되 성과를 랭킹하지 않는다** — 문헌이 이 선을 강하게 그린다.

## 결정적 설계 원칙 (문헌이 둘로 가른다)

**효과 있음 (붙여도 되는 것):**
- 기술/전략 *규범* + 모델링: descriptive norm은 행동을 바꾼다 (Cialdini, Reno, Kallgren 1990 focus theory of normative conduct, cit=5534; Schultz 1999 normative feedback field experiment). 자기/타자 모델링은 SRL을 높인다 (Clark & Ste-Marie 2007 self-as-model; Bandura observational learning).
- 사회적 학습분석 프레이밍 (Ferguson & Buckingham Shum 2012).
- 공동조절/사회적공유조절 (Järvelä & Hadwin 2013, CSCL).

**역효과 (붙이면 안 되는 것):**
- 성과 사회비교 = 대시보드 함정 (Jivet, Scheffel, Drachsler 2017 "Awareness Is Not Enough"; 2018 "License to evaluate") — 비교 자체가 자동으로 해롭고 reference frame이 전부.
- Schultz의 **boomerang effect**: descriptive norm만 주면 평균 이상인 사람은 *나빠진다* → injunctive(승인) 프레임과 함께 줘야.
- 사회비교는 mastery→performance 목표 전환을 유발 (Pintrich 2000; Elliot & Dweck) = SRL에 독.

→ **규칙:** (1) *전략·과정* 규범만, 성과 순위 금지. (2) 정상화("많은 학생이 처음엔 어려워해") = 자기효능 지지. (3) mastery + injunctive 프레임("이렇게 한 학생들이 더 잘 조절했어"). (4) Marin이 *코칭 무브*로 전달(피드가 아니라 맥락적 한마디). (5) opt-in·dismissable. (6) **근거 있는 것만** — 실제 익명 집계 or 증거기반 규범, 가짜 특정 또래 날조 금지.

## 데이터 소스 현실성 (연구앱 = 소표본)

3단 폴백, 항상 출처 라벨:
1. **실제 익명 집계** (N≥임계, 예 ≥5 세션 same subject/taskKind): "이 과목 학습자들이 가장 많이 고른 전략 = 인출연습(8명 중 6)". worker에 `/api/norms` 추가 — studentId 가로질러 익명 카운트(개인 식별 0).
2. **증거기반 규범** (N 부족 시): "시험 대비엔 인출연습·자기설명이 학습에 효과적" = OpenAlex 접지 일반 규범, "general evidence"로 라벨.
3. **절대 금지:** "철수가 지금 미적분 공부 중" 같은 가짜 특정 또래. LLM이 지어내지 않게 norm을 프롬프트에 *주입*(snapshot/RAG 패턴 그대로).

## 현재 시퀀스에 붙는 자연 지점

현 흐름: Home → GoalStudio(forethought) → ActiveSession(performance+Marin+T1) → Reflection → Dashboard.

| 지점 | 소셜 큐 | 이론 | 왜 자연스러운가 |
|---|---|---|---|
| **GoalStudio 전략 선택** ★P0 | "이 과제 학습자들이 자주 쓰는 전략: 인출연습·자기설명" + 계획 규범("보통 25분에 목표 2–3개") | Bandura 모델링 @ 결정 시점 | 이미 전략을 *고르는* 화면 — 모델을 바로 옆에 |
| **ActiveSession: 막힘/답요구 시** ★P1 | Marin: "여기서 많이들 자기설명으로 바꿔봐 — 해볼래?" | 대리 전략 + help-seeking 조형 | 이미 Marin이 코칭 중, 한 줄 추가 |
| **ActiveSession: T1 poor-context** ★P1 | "자리가 안 맞을 때 도서관으로 옮긴 학생이 많았어" | 환경구조화 모델링 (T1과 직결) | poor 신호 → 조절 모델 제시 |
| **Reflection** P2 | "다음에 뭘 바꿀지 적은 학생들이 calibration이 좋아졌어" (과정 규범) | injunctive 과정 규범 | 성찰 = 규범 프레이밍 적소 |
| **Dashboard** P2(주의) | 전략 *다양성/일관성*을 성장으로(순위 아님), opt-in | Jivet 경고 준수 | 비교는 process만, dismissable |

## 데이터 객체 (도메인 추가)

```ts
export type NormSource = 'peer_aggregate' | 'general_evidence';
export interface SocialCue {
  kind: 'strategy_norm' | 'plan_norm' | 'context_regulation_norm' | 'process_norm';
  message: string;          // 학습자 표시 문구 (mastery+injunctive 프레임)
  source: NormSource;       // 출처 라벨 (투명성)
  n?: number;               // peer_aggregate일 때 표본수
  basis?: string;           // 예: "retrieval_practice 6/8 in Calculus"
}
```
연구 추적용 이벤트: `social_cue_shown`, `social_cue_acted`(전략 채택/조절 실행 시).

## Marin 전달 (피드 아님 = 코칭)

ActiveSession 소셜 큐는 buildContextSnapshot에 `socialNorms` 블록으로 주입 → Marin이 *자연스럽게* 한 줄. 정책과 연동: help_avoidance/poor-context 시 정책이 social_cue를 *허용*. LLM 날조 차단 = 규범을 프롬프트가 제공(스스로 만들지 말 것 명시).

## 단계 구현 (직관적 순서)

- **P0 (즉시, 저위험):** GoalStudio 전략 모델 카드. worker `/api/norms?subject&taskKind` (익명 집계, N<5면 evidence 폴백). UI = 전략 칩 위 한 줄 "Students on similar work often use… (peer N=6 · or general evidence)". 클릭 시 그 전략 프리필. 이벤트 social_cue_shown/acted.
- **P1:** Marin in-session 소셜 전략 넛지(막힘/답요구) + T1 poor-context 환경조절 모델. snapshot socialNorms 주입 + 정책 게이트.
- **P2:** Reflection 과정 규범 + Dashboard process-only 비교(opt-in, Jivet 가드).

## 정직성/위험
- 소표본 초기엔 peer_aggregate가 거의 안 뜸 → evidence 폴백이 기본, 솔직히 라벨.
- boomerang/수행목표 위험 → 성과 수치 절대 비표시, injunctive 프레임 강제.
- 프라이버시 = 익명 카운트만, k-익명(N<5 비공개)으로 비식별.
- 이론적 일관성: 이건 SRL 사회인지의 *사회 항* 계측 = NECESSITY_ARGUMENT의 "환경 항"과 쌍을 이루는 두 번째 under-instrumented arm. 논문에서 "environmental + social arms of social-cognitive SRL"로 묶을 수 있음.

## 앵커 (OpenAlex 검증)
- Cialdini, Reno & Kallgren (1990) focus theory of normative conduct.
- Schultz (1999) normative feedback field experiment (boomerang).
- Jivet, Scheffel, Drachsler, Specht (2017) Awareness Is Not Enough; (2018) License to evaluate.
- Clark & Ste-Marie (2007) self-as-model & SRL.
- Ferguson & Buckingham Shum (2012) Social learning analytics.
- Järvelä & Hadwin (2013) regulating learning in CSCL.
- Pintrich (2000); Elliot & Dweck (2013) goal orientation (mastery vs performance).
