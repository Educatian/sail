# T1 구현 스펙 — 세션 중간 순간 측정 (EMA급 환경-조절 측정 + 스캐폴드)

**목표:** 강화 논증(`NECESSITY_ARGUMENT.md` 전제 B·D)을 artifact에서 *참*으로 만든다. 현재 맥락은 세션 *시작*(`intentionallyChosen`)과 *끝*(`contextHelpfulness`)에만 측정됨 = 사실상 pre/post. T1은 세션 *도중* 반복 측정해 (a) 환경 적합도를 *시계열*로 잡고(=EMA), (b) 환경 *조절 행위*를 이벤트로 포착하며(=환경 구조화의 과정화), (c) 그 프롬프트 자체가 메타인지 모니터링을 스캐폴딩한다(=개입 팔).

**마이그레이션 불필요(검증됨):** 세션은 `sessions.json TEXT` blob으로 저장(`worker/schema.sql`)되고 events 테이블은 free-form(`type`+`payload`). 따라서 T1은 **타입 + UI + 프롬프트/정책 로직**만 건드린다. DB 변경 0.

---

## 1. 트리거 로직 (원칙 있는 설계 — 무작위 금지)

EMA 표준(Shiffman, Stone, Hufford 2007)의 두 표집을 결합:

- **시간 수반(signal-contingent):** *온태스크 경과 시간* 기준(벽시계 아님). 현재 `elapsedMs(session.timerSegments)` 사용 가능(`ActiveSession.tsx:371`). 1차 체크 = `min(15분, plannedMinutes*0.5)` 도달 시. 2차(선택) = `plannedMinutes*0.85`. **세션당 최대 2회**(EMA 참여부담 best practice).
- **사건 수반(event-contingent):** 세션 중 맥락이 *변하면* 즉시. 신호: `spatialTrace.mobilityState`가 `'moving'`으로 전환되거나 `transitionCount` 증가(`liveSpatialTrace`가 이미 계산, `ActiveSession.tsx:96,119`). "방금 이동했네 — 새 자리 괜찮아?"가 바로 환경 조절 측정의 황금 순간.
- **수동(manual):** 학습자가 직접 띄울 수 있는 작은 버튼(선택).
- **가드:** `streaming` 중 금지, checkpoint 열려있을 때 금지, 직전 체크로부터 `>=` 8분 경과, `checkCount < 2`.

구현: `ActiveSession.tsx`의 기존 1초 tick effect(`:160`) 안에서 조건 평가, 또는 별도 effect. refs: `lastCheckAtRef`, `checkCountRef`, state `momentaryDue: 'time'|'movement'|null`.

```ts
// ActiveSession.tsx, near other refs (~:145)
const lastCheckAtRef = useRef(0);
const checkCountRef = useRef(0);
const [momentaryDue, setMomentaryDue] = useState<null | 'time' | 'movement'>(null);

// new effect (after the timer tick effect ~:160)
useEffect(() => {
  if (!session || momentaryDue || streaming || checkpoint) return;
  if (checkCountRef.current >= 2) return;
  const onTaskMin = elapsedMs(session.timerSegments) / 60000;
  const sinceLast = (Date.now() - lastCheckAtRef.current) / 60000;
  if (sinceLast < 8) return;
  const moved = session.spatialTrace?.mobilityState === 'moving';
  const firstDue = onTaskMin >= Math.min(15, session.plannedMinutes * 0.5);
  const secondDue = checkCountRef.current === 1 && onTaskMin >= session.plannedMinutes * 0.85;
  if (moved) setMomentaryDue('movement');
  else if ((checkCountRef.current === 0 && firstDue) || secondDue) setMomentaryDue('time');
}, [session, streaming, checkpoint, momentaryDue, /* force re-eval via tick */ ]);
```
(tick effect의 `force((n)=>n+1)`가 매초 리렌더하므로 위 effect도 매초 재평가됨.)

---

## 2. 데이터 모델 추가 (3복사본: app/server/worker `domain.ts`)

```ts
export type ContextFit = 'good' | 'mixed' | 'poor';
export type RegulationAction = 'stayed' | 'changed_place' | 'removed_distraction' | 'took_break' | 'none';

export interface MomentaryCheck {
  at: string;                 // ISO, in-the-moment (EMA 시계열 핵심)
  elapsedOnTaskMin: number;
  trigger: 'time' | 'movement' | 'manual';
  focus: Rating;              // 1-5 순간 집중도
  contextFit: ContextFit;     // 지금 이 자리, 효과 있나
  regulationAction: RegulationAction;  // 그래서 뭘 했나 = 환경 구조화 행위
  placeCategoryAtCheck?: PlaceCategory; // 시작과 다를 수 있음
  mobilityStateAtCheck?: MobilityState;
}
```
`StudySession`에 추가: `momentaryChecks?: MomentaryCheck[];` (세 복사본 모두, blob 저장이라 자동 영속)

`MetricEventType` union에 추가(세 복사본): `'momentary_check_shown' | 'momentary_check_answered' | 'context_regulated'`

---

## 3. UI 카드 (ActiveSession.tsx — 기존 checkpoint 카드 스타일 재사용 `:517-535`)

mentor 메시지 영역 위 또는 입력바 위 고정. 비차단·dismissable. 3행:
1. "How's your focus right now?" → 5점 세그먼트(기존 Rating UI 패턴)
2. "Is this spot working?" → good / mixed / poor pill
3. (mixed|poor 선택 시 노출) "What will you do?" → stay / change place / remove distraction / take break

```tsx
{momentaryDue && (
  <div className="mx-5 mt-3 rounded-2xl border border-accent/40 bg-accent/5 p-3">
    <div className="label-mono accent mb-1">
      Momentary check {momentaryDue === 'movement' ? '· you moved' : ''}
    </div>
    {/* focus 1-5, contextFit pills, conditional regulationAction pills */}
    {/* 각 탭 즉시 setLocal; 3행 완료 시 submitMomentary() 자동 호출 */}
    <button onClick={() => dismissMomentary()} className="mt-2 text-xs text-ink/45">Not now</button>
  </div>
)}
```
local state로 focus/fit/action 모으고, fit==='good'이면 action='stayed' 자동·즉시 제출; mixed/poor면 action 선택 후 제출.

---

## 4. 제출 핸들러 (ActiveSession.tsx)

```ts
async function submitMomentary(focus: Rating, contextFit: ContextFit, regulationAction: RegulationAction) {
  if (!session) return;
  const check: MomentaryCheck = {
    at: new Date().toISOString(),
    elapsedOnTaskMin: Math.round(elapsedMs(session.timerSegments) / 60000),
    trigger: momentaryDue ?? 'manual',
    focus, contextFit, regulationAction,
    placeCategoryAtCheck: session.contextTrace?.placeCategory,
    mobilityStateAtCheck: session.spatialTrace?.mobilityState,
  };
  const checks = [...(session.momentaryChecks ?? []), check];
  lastCheckAtRef.current = Date.now();
  checkCountRef.current += 1;
  setMomentaryDue(null);
  void api.track('momentary_check_answered',
    { trigger: check.trigger, focus, contextFit, regulationAction, elapsedOnTaskMin: check.elapsedOnTaskMin },
    id, session.condition);
  if (regulationAction !== 'stayed' && regulationAction !== 'none')
    void api.track('context_regulated', { regulationAction, contextFit, from: check.placeCategoryAtCheck }, id, session.condition);
  await patch({ momentaryChecks: checks });   // 기존 patch() 재사용 :211
}
```
`momentary_check_shown`은 카드 렌더 시 1회 track.

---

## 5. 멘토 연동 (prompts.ts × 2: worker/server) — 센서가 아니라 *스캐폴드*가 되도록

`buildContextSnapshot`(`worker/src/prompts.ts:4`)에 요약 추가:
```ts
momentary: (s.momentaryChecks ?? []).length ? {
  count: s.momentaryChecks!.length,
  latest: s.momentaryChecks!.at(-1),         // focus/contextFit/regulationAction
  focusTrend: s.momentaryChecks!.map(c => c.focus),  // 세션 내 집중 추이
} : null,
```
→ Marin이 자연스럽게 참조: "you flagged this spot as poor and changed seats — is the new one helping you focus?" (맥락 조절을 대화에서 강화)

---

## 6. 정책 연동 (policy.ts × 2) — 환경-조절 구인이 *개입을 구동*

`decidePolicy`(`worker/src/policy.ts`)에 규칙 1개 추가 (기존 contextRisk 규칙 위/근처):
```ts
const lastCheck = session.momentaryChecks?.at(-1);
const flaggedButUnregulated = lastCheck?.contextFit === 'poor'
  && (lastCheck.regulationAction === 'stayed' || lastCheck.regulationAction === 'none');
// ...
if (flaggedButUnregulated)
  return { action: 'prompt_control', phaseTarget, intensity: 'medium',
    reason: 'environment flagged poor but left unregulated', confidence: 0.7 };
```
→ "환경이 별로라고 했는데 그대로 둠"을 감지해 *환경 조절을 촉구*. 이로써 환경 구조화가 측정될 뿐 아니라 정책의 입력이 됨(전제 A를 행동으로 닫음).

---

## 7. 분석 훅 (learner.ts — 최소만, 본격 분석은 T3)

`learner.ts`(이미 `contextPatterns` 보유 `:76-81`)에 추가:
```ts
momentaryFocusByFit: // contextFit별 평균 focus (good vs poor에서 집중이 실제로 갈리는지 1차 확인)
contextRegulationCount: // context_regulated 발생 수 = 환경 구조화 빈도
```
within-person·과제통제 본격 분석은 T3로 이월.

---

## 변경 파일 체크리스트

| 파일 | 변경 | 위험 |
|---|---|---|
| `app/src/domain.ts` | 타입 3 + StudySession 필드 + 이벤트 3 | 낮음 |
| `server/src/domain.ts` | 미러 | 낮음 |
| `worker/src/domain.ts` | 미러 | 낮음 |
| `app/src/routes/ActiveSession.tsx` | 트리거 effect + 카드 + submit | 중간(UI) |
| `worker/src/prompts.ts` | snapshot momentary 요약 | 낮음 |
| `server/src/prompts.ts` | 미러 | 낮음 |
| `worker/src/policy.ts` | flaggedButUnregulated 규칙 | 낮음 |
| `server/src/policy.ts` | 미러 | 낮음 |
| `learner.ts` ×2 | 요약 지표(선택) | 낮음 |
| **schema.sql** | **변경 없음** (blob + free-form events) | — |

## 검증 계획
1. `cd app && npm run build` (0 type error) + `cd worker && npx tsc --noEmit` + server 동일.
2. dev 스택 기동(server+app), 세션 생성 → 타이머 시작 → onTask 가속 위해 `plannedMinutes` 작게 → 1차 체크 카드 등장 확인.
3. mixed/poor + stayed 선택 → 다음 Marin 턴이 prompt_control로 환경 조절 촉구하는지 + `context_regulated` 미발생, `momentary_check_answered` 발생 확인.
4. poor + change_place → `context_regulated` 발생 확인.
5. `/api/export`에 momentaryChecks 시계열 포함 확인(EMA 데이터 산출).
6. 배포: worker `npx wrangler deploy` + app build→`wrangler pages deploy`.

## EMA 타당도 충족 표 (방법론 절에 명시)
- 시계열 타임스탬프(`at`) → within-session 추이 분석 가능 (pre/post가 놓치는 것).
- `trigger` 기록 → signal- vs event-contingent 구분(EMA 보고 표준).
- 세션당 ≤2회 + dismissable → 참여부담 통제(Shiffman 2007).
- `placeCategoryAtCheck`/`mobilityStateAtCheck` → 세션 중 환경 변화 포착(환경 구조화 과정화).
- `regulationAction` → 환경 조절을 *행동*으로 조작화(전제 A의 환경 구조화를 self-report 너머로).
