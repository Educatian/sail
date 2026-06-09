# 코스 · 성취목표 · 리마인더를 SAIL에 — 설계 (소셜큐 확장, OpenAlex 접지)

**한 줄:** 현재 세션은 `subject`(자유텍스트)로 흩어져 상위 구조가 없다. **Course + AchievementGoal 레이어**를 넣으면 소셜큐·리마인더·성취목표가 그 척추에 자연스럽게 매달리고, 나중에 Canvas 연결의 앵커가 된다.

## 왜 척추가 필요한가
- 소셜큐가 의미 있으려면 *코스 안에서* 비교해야 함("미적분 학습자들이…"). subject 자유텍스트로는 집계가 안 됨.
- 리마인더가 "왜 지금"을 가지려면 *성취목표 대비 진척 간극*이 필요.
- 성취목표(distal)는 *근접 하위목표*(proximal)로 쪼개야 자기효능이 산다 (Bandura & Schunk 1981, cit=2535).

## 이론 접지 (OpenAlex 검증)
- **목표설정**: 구체적·도전적 목표가 수행을 높임 (Locke & Latham 1990; Latham & Locke 1991 self-regulation through goal setting).
- **근접 하위목표**: distal보다 proximal subgoal이 자기효능·내재흥미를 키움 (Bandura & Schunk 1981). → 성취목표를 subgoal로 분해.
- **리마인더 = 실행의도**: 단순 알림이 아니라 if-then 계획이 목표달성을 크게 높임 (Gollwitzer 1999 cit=5253; Gollwitzer & Sheeran 2006 메타분석).
- **간격효과**: 분산학습>벼락치기 (Kornell 2009). → 간격 리마인더 정당화(기존 reminders.ts에 이미 spacing).
- **SRL→목표달성**: 온라인 코스에서 SRL 전략이 목표달성을 예측 (Kizilcec & Pérez-Sanagustín 2016 cit=938).
- **성취목표 지향**: mastery 프레임 유지, performance/순위 금지 (Ames 1992; Pintrich 2000; Elliot & Harackiewicz 1996).
- **LMS 연결**: LMS 데이터가 코스 성취 예측 (You 2015; Cerezo process mining 2019).

## 데이터 모델 (도메인 추가)

```ts
export interface Course {
  id: string; studentId: string;
  title: string;                 // "Calculus II"
  externalId?: string;           // future Canvas course id (연결 앵커)
  externalSource?: 'canvas' | 'manual';
  termEnd?: string;              // 학기/마감
  createdAt: string;
}
export type GoalOrientation = 'mastery' | 'performance';  // 측정용; UI는 mastery 강제
export interface ProximalSubgoal { id: string; text: string; targetDate?: string; done: boolean }
export interface AchievementGoal {
  id: string; studentId: string; courseId: string;
  distal: string;                // "Master integration techniques by midterm" (Locke&Latham 구체+도전)
  orientation: GoalOrientation;  // 연구 추적; default mastery
  targetDate?: string;
  subgoals: ProximalSubgoal[];   // Bandura&Schunk proximal 분해
  createdAt: string; updatedAt: string;
}
```
StudySession += `courseId?: string`, `subgoalId?: string` (세션을 코스·근접목표에 연결; subject는 표시용으로 유지/호환).
이벤트 += `course_created | goal_set | subgoal_completed | reminder_sent(기존 확장)`.

## 리마인더 업그레이드 (기존 reminders.ts 확장)

현재 = spacing 기반 메타인지 이메일. 추가 레이어:
1. **if-then 실행의도** (Gollwitzer): "*도서관에 도착하면* 미적분 인출연습 10분으로 시작" — 리마인더가 if-then 문장을 담음(학습자가 forethought에서 한 번 설정 or 자동 생성).
2. **성취목표 간극**: "중간고사 목표까지 3개 근접목표 중 1개 완료. u-치환 미착수 3일째."
3. **간격**: 기존 per-subject due → per-course due로 re-key.
4. **소셜 규범 한 줄**(injunctive): "이 코스 학습자들은 보통 주 3회 인출연습으로 조절했어요" (peer N or general evidence).
5. 채널: 기존 이메일(Resend) 유지 + 인앱 배너. 빈도 캡 유지(20h dedup).

## 현재 시퀀스에 붙는 자연 지점 (코스 척추 기준)

| 지점 | 추가 | 이론 |
|---|---|---|
| **Home/Onboarding** ★P0 | "Courses & goals" — 코스 생성 + 성취목표(distal) + 근접목표 2–3개 + 마감 | 코스레벨 forethought; Locke&Latham + Bandura&Schunk |
| **GoalStudio** ★P0 | 코스 선택 → 세션목표를 *다음 근접목표*에서 자동제안("오늘 목표: u-치환"); 소셜큐 코스 범위 | distal→proximal→session 연쇄 |
| **ActiveSession** P1 | Marin이 코스·목표 인지("중간고사 목표 기준 이 단계는…"); poor-context 소셜큐(T1 연동) | 목표맥락 코칭 |
| **Reflection** P1 | 근접목표 완료 체크 + 다음 if-then 실행의도 1개 설정 | Gollwitzer; 과정규범 |
| **Reminder(cron/이메일)** ★P0.5 | if-then + 목표간극 + spacing + 소셜규범 | 위 5레이어 |
| **Dashboard** P2 | 성취목표 진척(근접목표 완료율, mastery), calibration; 순위 금지 | Ames mastery 구조 |

## Canvas 연결 (현실적 단계)
- **지금**: 인앱 Course/AchievementGoal로 척추만. `externalId`/`externalSource` 필드를 *미리* 둠 = 나중 매핑 앵커.
- **나중**: Canvas LTI(ltijs, 로드맵) 또는 가벼운 import. KPIDT 연구상 JOL은 Canvas 폼(봇 밖, Nelson-Narens)이므로 Canvas 연결은 측정 분리에도 기여.
- 풀 LTI를 지금 짓지 않음 — 과설계. 인앱 먼저, 연결은 필드만 준비.

## 단계 구현 (직관적 순서)
- **P0:** Course + AchievementGoal 도메인 ×3 + worker/server CRUD(/api/courses, /api/goals) + Home "Courses & goals" + GoalStudio 코스선택·subgoal 자동제안. (소셜큐 P0와 함께: norms를 courseId로 집계)
- **P0.5:** reminders.ts에 if-then + 목표간극 + 소셜규범 레이어; per-course spacing.
- **P1:** ActiveSession/Reflection 목표·subgoal 연동 + Marin 목표 인지 + Reflection if-then 설정.
- **P2:** Dashboard mastery 진척; Canvas import.

## 정직성/위험
- 성취목표 = mastery 프레임 강제(orientation은 연구 측정용일 뿐 UI 노출 X), performance/순위 금지(Jivet/Ames).
- if-then은 학습자 작성이 이상적; 자동생성 시 "초안, 수정하세요"로 제시(주체성 보존).
- 소표본 코스 norms는 evidence 폴백 + 라벨(소셜큐 설계 규칙 동일).
- 과설계 회피: Canvas는 필드만, 인앱 먼저. 성취목표는 distal 1 + subgoal 2–3로 가볍게.
- 이론 일관성: environmental arm(T1) + social arm(소셜큐) + **goal/course 척추**(forethought 상위층) = SRL forethought–performance–reflection 루프를 *코스 수명* 위로 확장. 논문에서 "multi-timescale SRL: session loop nested in course-goal loop"로 묶음.

## 앵커 (OpenAlex 검증)
- Locke & Latham (1990) A Theory of Goal Setting and Task Performance.
- Bandura & Schunk (1981) Cultivating competence through proximal self-motivation.
- Gollwitzer (1999); Gollwitzer & Sheeran (2006) implementation intentions.
- Kornell (2009) spacing > cramming.
- Kizilcec & Pérez-Sanagustín (2016) SRL strategies predict goal attainment (MOOCs).
- Ames (1992); Pintrich (2000); Elliot & Harackiewicz (1996) achievement goals.
- You (2015); Cerezo et al. (2019) LMS data / process mining for SRL.
