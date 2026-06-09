// FLoRA-pattern trace parser ported to SAIL (refs/FLoRA, no-ML symbolic mapping).
//   raw events -> Action Library -> action sequence -> Process Library (regex) -> SRL processes
//   + detection-gated fading (suppress a scaffold once its target SRL process is observed).
// FLoRA does SRL detection WITHOUT an LLM (Bannert process patterns); we keep that property.

// ---- 1) ACTION LIBRARY: SAIL event type -> learning action (FLoRA MyConstant.SUB_ACTION_LABEL_MAP) ----
export const ACTION_LIBRARY: Record<string, string> = {
  course_created: 'CHART_COURSE',
  goal_set: 'SET_GOAL',
  subgoal_completed: 'COMPLETE_SUBGOAL',
  forethought_changed: 'SET_PLAN',
  timer_started: 'START_FOCUS',
  timer_paused: 'PAUSE_FOCUS',
  mentor_turn_started: 'ASK_MENTOR',
  voice_input_started: 'ASK_MENTOR',
  mentor_turn_completed: 'READ_MENTOR',
  momentary_check_shown: 'MONITOR_PROMPTED',
  momentary_check_answered: 'SELF_MONITOR',
  metacog_experience: 'METACOG_PROBE',
  context_regulated: 'REGULATE_CONTEXT',
  reflection_changed: 'REFLECT',
};

export type SrlProcess =
  | 'ORIENTATION' | 'PLANNING' | 'MONITORING' | 'CONTROL' | 'EVALUATION' | 'HELP_SEEKING' | 'STUDYING';

// ---- 2) PROCESS LIBRARY: action-sequence regex -> SRL process (FLoRA MariaModel patterns) ----
// Sequence is encoded "i--ACTION=====j--ACTION=====..."; Bannert 3 levels (meta / cognitive).
export const PROCESS_PATTERNS: { proc: SrlProcess; level: 'metacognitive' | 'cognitive'; re: RegExp }[] = [
  // metacognitive — before studying: charting/goal/plan ahead of focus
  { proc: 'ORIENTATION', level: 'metacognitive', re: /\d+--(?:CHART_COURSE|SET_GOAL|SET_PLAN)=====(?:\d+--(?:CHART_COURSE|SET_GOAL|SET_PLAN|COMPLETE_SUBGOAL)=====)*\d+--START_FOCUS=====/ },
  // metacognitive — planning: goal then subgoal/plan
  { proc: 'PLANNING', level: 'metacognitive', re: /\d+--SET_GOAL=====(?:\d+--(?:COMPLETE_SUBGOAL|SET_PLAN)=====)+/ },
  // metacognitive — control: monitor -> act on it (the FLoRA "monitoring WITH control" signal)
  { proc: 'CONTROL', level: 'metacognitive', re: /\d+--(?:SELF_MONITOR|MONITOR_PROMPTED|METACOG_PROBE)=====(?:\d+--[A-Z_]+=====)*?\d+--REGULATE_CONTEXT=====/ },
  // metacognitive — monitoring during focus
  { proc: 'MONITORING', level: 'metacognitive', re: /\d+--START_FOCUS=====(?:\d+--[A-Z_]+=====)*?\d+--(?:SELF_MONITOR|METACOG_PROBE)=====/ },
  // metacognitive — evaluation after effort
  { proc: 'EVALUATION', level: 'metacognitive', re: /\d+--(?:PAUSE_FOCUS|READ_MENTOR|SELF_MONITOR)=====(?:\d+--[A-Z_]+=====)*?\d+--REFLECT=====/ },
  // cognitive — help-seeking
  { proc: 'HELP_SEEKING', level: 'cognitive', re: /\d+--ASK_MENTOR=====/ },
  // cognitive — studying
  { proc: 'STUDYING', level: 'cognitive', re: /\d+--START_FOCUS=====/ },
];

export interface TraceEvent { type: string; createdAt?: string }

export function encodeActions(events: TraceEvent[]): string {
  return events
    .map((e, i) => { const a = ACTION_LIBRARY[e.type]; return a ? `${i + 1}--${a}=====` : ''; })
    .join('');
}

// FLoRA match-and-replace: highest-priority pattern first, blank matched span with '*' to avoid double-count.
export function detectProcesses(events: TraceEvent[]): { detected: SrlProcess[]; counts: Record<string, number> } {
  let seq = encodeActions(events);
  const counts: Record<string, number> = {};
  const detected: SrlProcess[] = [];
  for (const { proc, re } of PROCESS_PATTERNS) {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    let found = false;
    while ((m = g.exec(seq)) !== null) { found = true; counts[proc] = (counts[proc] ?? 0) + 1; if (m.index === g.lastIndex) g.lastIndex++; }
    if (found) { detected.push(proc); seq = seq.replace(new RegExp(re.source, 'g'), '*'); }
  }
  return { detected, counts };
}

// ---- 3) DETECTION-GATED FADING (FLoRA GptScaffoldPromptService): suppress once target seen ----
export function shouldFade(target: SrlProcess, counts: Record<string, number>, threshold = 0): boolean {
  return (counts[target] ?? 0) > threshold;
}
