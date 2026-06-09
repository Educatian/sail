# Stretch Coach — 메타인지 경험(metacognitive experiences) 극대화 챗봇

**한 줄:** SRL planner(forethought 계획)와 별개로, performance/monitoring 단계에서 학습자의 **메타인지 경험(Flavell; Efklides)** — 앎의 느낌·어려움의 느낌·확신·"아하"·혼란 — 을 *스트레칭 스캐폴딩*(ZPD를 살짝 넘기는 desirable difficulty + productive struggle)으로 유발·극대화하고, 그 느낌을 메타인지 *지식*으로 전환하는 Marin 모드.

## 이론 접지 (OpenAlex 검증)
- **Efklides (2011) MASRL Model** (cit=1112): 메타인지×동기×정서의 SRL 통합. 메타인지 경험 = 온라인 층(task×person 상호작용에서 발생).
- **Efklides (2006)**: 메타인지 경험 = 메타인지 *느낌*(FOK/FOD/confidence/satisfaction) + *판단/추정*(JOL/EOL) + 온라인 과제지식. "느낌이 학습 과정을 알려준다."
- **Koriat (1997)** cue-utilization: 느낌은 mnemonic/heuristic *단서*에서 추론됨 → 챗봇이 단서를 조작해 느낌을 유발/교정.
- **Bjork & Bjork (2011)** desirable difficulties; **Pyc & Rawson (2009)** retrieval-effort: 노력적 인출이 더 깊은 학습 → "stretch".
- **Kapur (2008/2016) Productive Failure**: 가르치기 전에 *먼저 씨름*하게; 단 productive vs unproductive 구분(좌절 과도 시 fade).
- **Pekrun & Linnenbrink-Garcia (2014)**: 혼란은 *생산적 정서*가 될 수 있음(D'Mello/Graesser) — 단 해소 경로 제공 시.
- **Nelson & Narens (1990)** monitoring-control: 느낌→통제 결정.

## 챗봇 루프 (스트레칭 스캐폴딩 5단계)
1. **느낌 사전 프로브** — "시작 전, 이거 얼마나 안다고 느껴? (앎의 느낌)" → `probe` 1-5 캡처.
2. **스트레치** — 현재 파악을 *살짝 넘는* 질문/과제(ZPD; desirable difficulty). 알려주기 전에 *인출·생성* 먼저(productive failure).
3. **씨름 유지** — 답 보류, 노력·혼란이 등록되게. "지금 느낌이 어때 — 막힘/부분적/탁 트임?" (느낌을 *알아차리게*).
4. **해소 + 디브리프** — 밀고 나간 뒤 느낌을 *명명*하고 지식으로: "확신했는데 틀렸지 — 그 간극이 공부할 지점이야. 어떤 단서에 속았어?" (FOK 착각·calibration 교정, Koriat).
5. **느낌 사후 프로브** — 확신/어려움 재측정 → *변화(Δ)* = 메타인지 경험 텔레메트리.

## 안전장치 (productive ↔ unproductive)
- 스트레치는 ZPD 안에서만(짓누르지 않기). 좌절 신호 시 fade(Kapur unproductive failure 회피).
- 항상 해소 경로 제시(혼란을 방치하지 않기, Pekrun).
- mastery 프레임(점수 아님), 학습자 주체성 보존.

## 구현 (대화 엔진 재사용)
- **새 모드 `stretch`** in marin.ts(×2): 위 루프를 시스템 프롬프트로.
- **probe 프로토콜**(action-fence와 동형): Marin이 느낌을 캡처할 때
  \`\`\`probe
  {"feeling":"knowing|difficulty|confidence","prompt":"How hard did that feel?","phase":"pre|post"}
  \`\`\`
  → MarinChat이 1-5 칩 렌더 → 탭 시 `metacog_experience` 이벤트 로깅 + 등급을 user 턴으로 회신해 대화 지속.
- **텔레메트리**: `metacog_experience` 이벤트(feeling/value/phase) ×3 도메인. JOL/calibration(기존) + T1 momentary EMA와 한 묶음 = 메타인지 경험을 *측정 가능*하게.
- **표면**: ActiveSession(performance 단계) "✦ Stretch me" 버튼 → MarinChat mode=stretch, sessionId 전달(세션 맥락 인지).

## 연구적 의의
- 기존 라인 보완: 환경 항(T1) + 사회 항(소셜큐) + **메타인지 경험 항**(Efklides MASRL의 정서·온라인 층). 셋 다 SRL이 선언했으나 앱이 덜 계측한 층.
- Δ느낌(pre→post) = desirable-difficulty 개입의 *경험적* 측정 = calibration 교정의 미시 증거.

## 앵커
Efklides (2006, 2011); Koriat (1997); Nelson & Narens (1990); Bjork & Bjork (2011); Pyc & Rawson (2009); Kapur (2008, 2016); Pekrun & Linnenbrink-Garcia (2014).
