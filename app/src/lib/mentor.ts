import type { MentorLabel, Checkpoint } from '../domain';

const LABEL_RE = /\[\[LABEL:(SOCRATIC|HINT_L1|HINT_L2|HINT_L3|EXPLAIN|VERIFY|FINISH)\]\]/;
const CHECK_RE = /```check\s*([\s\S]*?)```/;

export interface ParsedMentor {
  label?: MentorLabel;
  hintLevel: number;
  checkpoint?: Checkpoint;
  displayText: string;
}

/** Strip the control tag + check block from raw mentor text for clean rendering (mirrors server/src/mentor.ts). */
export function parseMentor(full: string): ParsedMentor {
  const labelMatch = full.match(LABEL_RE);
  const label = labelMatch?.[1] as MentorLabel | undefined;
  const hintLevel = label?.startsWith('HINT_L') ? Number(label.slice(-1)) : 0;

  let checkpoint: Checkpoint | undefined;
  const checkMatch = full.match(CHECK_RE);
  if (checkMatch) {
    try {
      const raw = JSON.parse(checkMatch[1].trim());
      if (raw && typeof raw.prompt === 'string' && Array.isArray(raw.options)) {
        checkpoint = {
          prompt: raw.prompt,
          options: raw.options.map((t: string, i: number) => ({ id: `o${i}`, text: String(t) })),
          allowFreeText: raw.allowFreeText !== false,
        };
      }
    } catch {
      /* still streaming / malformed — ignore */
    }
  }
  const displayText = full.replace(LABEL_RE, '').replace(CHECK_RE, '').trim();
  return { label, hintLevel, checkpoint, displayText };
}

const LABEL_BADGE: Record<MentorLabel, string> = {
  SOCRATIC: 'Question',
  HINT_L1: 'Hint',
  HINT_L2: 'Hint ++',
  HINT_L3: 'Worked step',
  EXPLAIN: 'Explanation',
  VERIFY: 'Check',
  FINISH: 'Wrap-up',
};
export const labelBadge = (l?: MentorLabel) => (l ? LABEL_BADGE[l] : '');
