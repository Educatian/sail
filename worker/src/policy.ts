import type { ChatMessage, PolicyDecision, StudySession } from './domain';
import type { LearnerModel } from './learner';

export function decidePolicy(session: StudySession, learner: LearnerModel, messages: ChatMessage[] = []): PolicyDecision {
  const phaseTarget = session.completed ? 'reflection' : session.inProgress ? 'performance' : 'forethought';
  const goalsDone = session.goals.filter((g) => g.isTicked).length;
  const goalRate = session.goals.length ? goalsDone / session.goals.length : 0;
  const recentAssistant = messages.filter((m) => m.role === 'assistant').slice(-3);
  const highHintCount = recentAssistant.filter((m) => (m.hintLevel ?? 0) >= 2).length;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? '';
  const asksForAnswer = /\b(answer|solution|just tell|give me|idk|don't know)\b/.test(lastUser);
  const correctionSaysIndependent = learner.recentCorrections.some((c) => /\b(not avoiding|independent|trying myself|on my own)\b/i.test(c));
  const noPlan = session.goals.length === 0 || session.strategies.length === 0;
  const calibrationGap = typeof session.confidencePre === 'number' && learner.calibration.recentError != null
    ? Math.max(Math.abs(session.confidencePre - 50), learner.calibration.recentError)
    : learner.calibration.recentError;
  const contextRisk = session.contextTrace?.placeCategory === 'transit' || session.contextTrace?.placeCategory === 'work_social';
  const lastCheck = session.momentaryChecks?.at(-1);
  const flaggedButUnregulated = lastCheck?.contextFit === 'poor' && (lastCheck.regulationAction === 'stayed' || lastCheck.regulationAction === 'none');

  if (highHintCount >= 3 && learner.scaffold.level === 'high') return { action: 'escalate', phaseTarget, intensity: 'high', reason: 'repeated regulation breakdown across recent turns', confidence: 0.69 };
  if (learner.scaffold.level === 'low' && goalRate >= 0.7 && !asksForAnswer) return { action: 'fade', phaseTarget, intensity: 'low', reason: 'stable progress and low scaffold need', confidence: 0.72 };
  if ((asksForAnswer && !correctionSaysIndependent) || highHintCount >= 2) return { action: 'prompt_control', phaseTarget, intensity: 'high', reason: asksForAnswer ? 'executive help-seeking signal' : 'repeated deep hints', confidence: 0.76 };
  if (noPlan) return { action: 'prompt_monitoring', phaseTarget: 'forethought', intensity: 'medium', reason: 'planning trace is missing', confidence: 0.7 };
  if (phaseTarget === 'reflection' || session.actualMinutes >= session.plannedMinutes) return { action: 'prompt_reflection', phaseTarget: 'reflection', intensity: 'medium', reason: 'plan-action-result comparison is due', confidence: 0.68 };
  if (flaggedButUnregulated) return { action: 'prompt_control', phaseTarget, intensity: 'medium', reason: 'environment flagged poor but left unregulated', confidence: 0.7 };
  if (contextRisk) return { action: 'prompt_monitoring', phaseTarget, intensity: 'low', reason: 'context may fragment attention', confidence: 0.58 };
  if (calibrationGap != null && calibrationGap >= 25) return { action: 'prompt_monitoring', phaseTarget, intensity: 'medium', reason: 'calibration gap suggests monitoring check', confidence: 0.66 };
  if (learner.scaffold.level === 'high') return { action: 'prompt_monitoring', phaseTarget, intensity: 'medium', reason: learner.scaffold.reason, confidence: 0.64 };
  return { action: 'abstain', phaseTarget, intensity: 'none', reason: 'no regulation breakdown detected', confidence: 0.61 };
}

export function policyInstruction(policy: PolicyDecision): string {
  const move = {
    abstain: 'Do not add an unsolicited scaffold. If replying, answer briefly and preserve learner agency.',
    prompt_monitoring: 'Ask one monitoring question about confidence, comprehension, progress, or attention.',
    prompt_control: 'Ask the learner to choose, compare, or revise a strategy before giving more help.',
    prompt_reflection: 'Prompt a brief plan-action-result-context reflection and one next adjustment.',
    fade: 'Fade support. Ask the learner to attempt or self-explain first; avoid hints unless requested.',
    escalate: 'Keep the learner-facing reply calm and concise; mark the repeated regulation breakdown for teacher-facing review.',
  }[policy.action];
  return `\n## Pedagogical policy layer\nSelected action: ${policy.action}\nTarget phase: ${policy.phaseTarget}\nIntensity: ${policy.intensity}\nReason: ${policy.reason}\nInstruction: ${move}\nThe LLM must realize this selected move; it must not independently choose a stronger intervention.`;
}
