import type { ChatMessage, MentorLabel, Checkpoint, LearnerState } from './domain';

const LABEL_RE = /\[\[LABEL:(SOCRATIC|HINT_L1|HINT_L2|HINT_L3|EXPLAIN|VERIFY|FINISH)\]\]/;
const STATE_RE = /\[\[STATE:(on_track|confused|planning_absent|help_avoidance|overconfident)\]\]/;
const CHECK_RE = /```check\s*([\s\S]*?)```/;

export interface ParsedMentor { label?: MentorLabel; state?: LearnerState; hintLevel: number; checkpoint?: Checkpoint; displayText: string }

export function parseMentor(full: string): ParsedMentor {
  const labelMatch = full.match(LABEL_RE);
  const label = labelMatch?.[1] as MentorLabel | undefined;
  const state = full.match(STATE_RE)?.[1] as LearnerState | undefined;
  const hintLevel = label?.startsWith('HINT_L') ? Number(label.slice(-1)) : 0;
  let checkpoint: Checkpoint | undefined;
  const checkMatch = full.match(CHECK_RE);
  if (checkMatch) {
    try {
      const raw = JSON.parse(checkMatch[1].trim());
      if (raw && typeof raw.prompt === 'string' && Array.isArray(raw.options)) {
        checkpoint = { prompt: raw.prompt, options: raw.options.map((t: string, i: number) => ({ id: `o${i}`, text: String(t) })), allowFreeText: raw.allowFreeText !== false };
      }
    } catch { /* ignore */ }
  }
  const displayText = full.replace(LABEL_RE, '').replace(STATE_RE, '').replace(CHECK_RE, '').trim();
  return { label, state, hintLevel, checkpoint, displayText };
}

export function hintLevelSoFar(messages: ChatMessage[]): number {
  return messages.reduce((max, m) => Math.max(max, m.hintLevel ?? 0), 0);
}

export function toLlmMessages(messages: ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  return messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant' ? parseMentor(m.content).displayText : m.content,
  }));
}
