import type { HelpSeekingQuality, MentorLabel, PolicyAction, ScaffoldFidelity } from './domain';

export function classifyHelpSeeking(text: string): HelpSeekingQuality {
  const t = text.toLowerCase();
  if (!t.trim()) return 'none';
  if (/\b(just tell|give me the answer|what is the answer|solve it for me|do it for me)\b/.test(t)) return 'executive';
  if (/\b(idk|i don't know|no idea|stuck|confused|lost|can't start)\b/.test(t)) return 'avoidance';
  if (/\b(why|how|hint|where am i wrong|check my|does this make sense|explain|help me understand)\b/.test(t)) return 'instrumental';
  return 'none';
}

export function scaffoldFidelity(policy: PolicyAction, label?: MentorLabel): ScaffoldFidelity {
  if (!label) return 'not_applicable';
  const ok: Record<PolicyAction, MentorLabel[]> = {
    abstain: ['EXPLAIN', 'SOCRATIC', 'FINISH'],
    prompt_monitoring: ['SOCRATIC', 'VERIFY'],
    prompt_control: ['SOCRATIC', 'HINT_L1'],
    prompt_reflection: ['SOCRATIC', 'VERIFY', 'FINISH'],
    fade: ['SOCRATIC', 'VERIFY'],
    escalate: ['SOCRATIC', 'HINT_L1'],
  };
  return ok[policy].includes(label) ? 'aligned' : 'drift';
}
