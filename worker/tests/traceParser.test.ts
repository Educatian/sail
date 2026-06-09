// Run: node --experimental-strip-types worker/src/traceParser.test.ts
import { encodeActions, detectProcesses, shouldFade, ACTION_LIBRARY } from '../src/traceParser.ts';

let pass = 0, fail = 0;
const ok = (n: string, c: boolean) => { c ? pass++ : fail++; console.log((c ? 'PASS' : 'FAIL') + '  ' + n); };
const ev = (...types: string[]) => types.map((type) => ({ type }));

console.log('— Action Library —');
ok('maps event types to actions', encodeActions(ev('goal_set', 'timer_started')) === '1--SET_GOAL=====2--START_FOCUS=====');
ok('drops unmapped events', encodeActions(ev('client_error', 'goal_set')).includes('SET_GOAL') && !encodeActions(ev('client_error')).length);

console.log('\n— Process Library (action seq → SRL process) —');
let d = detectProcesses(ev('course_created', 'goal_set', 'subgoal_completed', 'timer_started'));
ok('chart→goal→subgoal→focus ⇒ ORIENTATION', d.detected.includes('ORIENTATION'));
d = detectProcesses(ev('goal_set', 'subgoal_completed', 'subgoal_completed'));
ok('goal→subgoals ⇒ PLANNING', d.detected.includes('PLANNING'));
d = detectProcesses(ev('timer_started', 'momentary_check_answered'));
ok('focus→self-monitor ⇒ MONITORING', d.detected.includes('MONITORING'));
d = detectProcesses(ev('momentary_check_answered', 'context_regulated'));
ok('monitor→regulate ⇒ CONTROL (monitoring WITH control)', d.detected.includes('CONTROL'));
d = detectProcesses(ev('timer_paused', 'reflection_changed'));
ok('pause→reflect ⇒ EVALUATION', d.detected.includes('EVALUATION'));
d = detectProcesses(ev('mentor_turn_started'));
ok('ask mentor ⇒ HELP_SEEKING', d.detected.includes('HELP_SEEKING'));
d = detectProcesses(ev('momentary_check_answered'));
ok('bare self-monitor (no regulate) ⇒ no CONTROL', !d.detected.includes('CONTROL'));

console.log('\n— Detection-gated fading —');
d = detectProcesses(ev('course_created', 'goal_set', 'timer_started'));
ok('ORIENTATION detected ⇒ fade orientation scaffold', shouldFade('ORIENTATION', d.counts) === true);
ok('PLANNING not detected ⇒ keep planning scaffold', shouldFade('PLANNING', d.counts) === false);

console.log('\n— Library shape —');
ok('action library is non-empty + string→string', Object.keys(ACTION_LIBRARY).length >= 12 && typeof Object.values(ACTION_LIBRARY)[0] === 'string');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
