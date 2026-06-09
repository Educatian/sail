# T1 (현실 조작화판) — 유기적 접점 event-contingent EMA

원래 T1(`T1_IMPLEMENTATION_SPEC.md`)의 비현실 요소 교체:
- ❌ GPS 이동 수반 트리거 (실내 GPS 망가짐, 코드도 인정) → ✅ 자연 행동 트리거
- ❌ 백그라운드/고정간격 인터럽트 (웹·Capacitor 포그라운드 한계, 푸시 불가) → ✅ 앱이 이미 포그라운드인 순간에만
- 측정 대상 = 환경 *조절*(지각+행동)이지 좌표 아님 → 보고·행동 중심이 구인 타당도 더 높음

## 트리거 (모두 앱 포그라운드 보장 + 공부 방해 안 함)
- **break**: 타이머 일시정지 시 (`toggleTimer` 일시정지 분기). onTask≥10분 & checkCount<2 & 직전체크≥8분.
- **return**: `visibilitychange`로 복귀, 직전 hidden이 ≥3분 & 세션 running이었음. ("자리 옮겼어? 지금 집중도는?" = 이동을 GPS 아닌 질문으로)
- **manual**: 타이머 옆 "Check in" 버튼.

## 데이터 모델 (3복사본)
```ts
export type ContextFit = 'good' | 'mixed' | 'poor';
export type RegulationAction = 'stayed' | 'changed_place' | 'removed_distraction' | 'took_break' | 'none';
export type MomentaryTrigger = 'break' | 'return' | 'manual';
export interface MomentaryCheck {
  at: string; elapsedOnTaskMin: number; trigger: MomentaryTrigger;
  focus: Rating; contextFit: ContextFit; regulationAction: RegulationAction;
  placeCategoryAtCheck?: PlaceCategory; mobilityStateAtCheck?: MobilityState;
}
```
StudySession += `momentaryChecks?: MomentaryCheck[];`
Events += `momentary_check_shown | momentary_check_answered | context_regulated`

## 연동
- prompts buildContextSnapshot: momentary 요약(latest + focusTrend) → Marin 참조
- policy: `contextFit==='poor' && regulationAction in (stayed,none)` → prompt_control "environment flagged poor but unregulated"
- learner: momentaryFocusByFit + contextRegulationCount (선택)

## GPS 라이브 트래킹 = 강등(제거 안 함)
opt-in·포그라운드 기회주의 보조 신호로 유지. 어떤 측정 주장도 GPS 비의존. 백본 = 장소범주(시작)+접점 순간보고/조절행위(중간)+도움도(끝).

## 방법론 정당화
event-contingent EMA at organic self-regulation touchpoints (Shiffman, Stone, Hufford 2007); ≤2/session + dismissable = 부담 통제; trigger 기록 = 표집 유형 구분.
