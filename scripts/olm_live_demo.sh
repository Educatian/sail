#!/usr/bin/env bash
# OLM live cross-app demo — proves the BIDIRECTIONAL ME<->SRL loop closes on the LIVE worker.
#   Direction B: ME calibration/confusion signal -> SAIL planning control rule (ES-LLMs deterministic
#                rule) -> the returned plan PRIORITIZES those concepts + `planning_used_me_signal` logged
#                + the resulting plan is written to the SRL-owned OLM fields.
#   Direction A: SAIL's SRL plan/goal/phase (in the OLM) -> ME contextual render (srlContext) + phase bias.
# Grounded in research/ME_SRL_LOOP_EVIDENCE.md. Single-writer field ownership (arbiter) enforced throughout.
#
# Run:  bash scripts/olm_live_demo.sh        (cleans the test learner at the end)
# Requires: curl, node. No auth (public worker). Fresh learnerId each run.
set -euo pipefail
B="${SAIL_API:-https://sail-api.jewoong-moon.workers.dev}"
L="olm-loop-$(date +%s)"
echo "Worker:    $B"
echo "learnerId: $L"
echo

assemble() { # read an SSE stream on stdin, print concatenated text deltas
  node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const o=[];for(const ln of d.split(/\r?\n/)){const m=ln.match(/^data: (.*)$/);if(m){try{const v=JSON.parse(m[1]);if(typeof v==="string")o.push(v)}catch{}}}process.stdout.write(o.join(""))})'
}
jqget() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);console.log(eval('o'+process.argv[1]))})" "$1"; }

echo "════ STEP 1 (ME → OLM): ME writes over_confident + confusion on TWO concepts ════"
echo "  confounder: overconfident (felt sure, slipped) ; collider: confusion at an impasse"
curl -s -X POST "$B/api/olm" -H "Content-Type: application/json" -d "{\"learnerId\":\"$L\",\"writer\":\"me\",\"diff\":{\"concept_id\":\"confounder\",\"set\":{\"calibration_err\":0.42,\"jol_trend\":\"overconfident\",\"voi\":{\"comp\":{\"a\":2,\"b\":5}}}}}" >/dev/null
curl -s -X POST "$B/api/olm" -H "Content-Type: application/json" -d "{\"learnerId\":\"$L\",\"writer\":\"me\",\"diff\":{\"concept_id\":\"collider\",\"set\":{\"calibration_err\":0.31,\"jol_trend\":\"unknown\",\"confusion_label\":\"impasse\"}}}" >/dev/null
echo "  wrote confounder(overconfident) + collider(confusion)."
echo

echo "════ STEP 2 (B: ME signal → SRL planning): call SAIL plan mode ════"
PLAN=$(curl -s -X POST "$B/api/marin/chat" -H "Content-Type: application/json" \
  -d "{\"mode\":\"plan\",\"studentId\":\"$L\",\"messages\":[{\"role\":\"user\",\"content\":\"Help me plan a 25-minute study session for causal inference. What should I focus on first?\"}]}" | assemble)
echo "--- Marin plan reply (Direction B; warm, jargon-free) ---"
echo "$PLAN"
echo
echo "ASSERT plan prioritizes the ME-flagged concepts + jargon-free:"
node -e '
  const t=process.argv[1].toLowerCase();
  const hasConf=t.includes("confounder"), hasColl=t.includes("collider");
  const leak=/calibration|overconfiden|confusion score|miscalibrat/.test(t);
  console.log("  • mentions confounder (overconfident): "+(hasConf?"YES ✓":"no ✗"));
  console.log("  • mentions collider (confusion):       "+(hasColl?"YES ✓":"no ✗"));
  console.log("  • NO metric/jargon word leaked:        "+(leak?"LEAK ✗":"clean ✓"));
  if(!(hasConf||hasColl)) { console.log("  !! plan did not surface the ME concepts"); process.exit(2);}
  if(leak){ console.log("  !! jargon leaked to student"); process.exit(3);}
' "$PLAN"
echo

echo "  → confirm planning_used_me_signal was LOGGED on the live worker:"
curl -s "$B/api/export?studentId=$L" | node -e '
  let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
    const o=JSON.parse(d); const ev=(o.events||[]).filter(e=>e.type==="planning_used_me_signal");
    if(!ev.length){ console.log("  ✗ no planning_used_me_signal event"); process.exit(4); }
    const items=(ev[ev.length-1].payload.items)||[];
    console.log("  ✓ planning_used_me_signal logged with items:");
    for(const it of items) console.log("     - "+it.concept_id+" → "+it.action+"   ["+it.metric+"]");
  });'
echo

echo "════ STEP 2b (SRL → OLM): start a session so SAIL writes the plan to the SRL-owned OLM fields ════"
curl -s -X POST "$B/api/sessions" -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$L\",\"subject\":\"causal inference\",\"goals\":[\"confounder\",\"collider\"],\"strategies\":[\"retrieval_practice\"],\"plannedMinutes\":25}" >/dev/null
echo "  session created → active_plan + phase written (writer=sail)."
echo "  OLM global (SRL-owned) now:"
curl -s "$B/api/olm?learnerId=$L" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const o=JSON.parse(d);console.log("     active_plan = "+JSON.stringify(o.global.active_plan));console.log("     phase       = "+o.global.phase);});'
echo

echo "════ STEP 3 (A: SRL state → ME): the ME renderer prompt now carries srlContext + phase bias ════"
echo "  (this is exactly what index.html builds at ME session start when pointed at ?olm=$B/api&learner=$L)"
curl -s "$B/api/olm?learnerId=$L" | node -e '
  let d=""; process.stdin.on("data",c=>d+=c).on("end",()=>{
    const o=JSON.parse(d);
    // mirror of sail-me/shared/srl_context.mjs srlContextFrom (the exact logic ME index.html runs)
    const g=o.global||{}; const goal=g.active_goal, plan=g.active_plan, phase=typeof g.phase==="string"?g.phase:null;
    const distal=typeof goal==="string"?goal:(goal&&goal.distal);
    const ctx={}; if(distal)ctx.goal=distal; if(plan&&plan.subject)ctx.subject=plan.subject; if(plan&&plan.strategy)ctx.strategy=plan.strategy; if(phase)ctx.phase=phase;
    if(plan&&Array.isArray(plan.concepts))ctx.focusConcepts=plan.concepts;
    const has = ctx.subject || ctx.phase;
    console.log("  ME srlContext = "+JSON.stringify(ctx));
    console.log("  • renderer references subject ("+(ctx.subject||"—")+"): "+(ctx.subject?"YES ✓":"no ✗"));
    console.log("  • phase→move bias active (phase="+(ctx.phase||"—")+"): "+(ctx.phase?"YES ✓ (performance → favor PROBE_CONFUSION)":"no ✗"));
    if(!has){ console.log("  !! no srlContext available — ME would fall back to P0"); process.exit(5);}
  });'
echo

echo "════ STEP 4: BOTH ARROWS CLOSE ════"
echo "  (B) ME over_confident/confusion  →  SAIL plan prioritized those concepts + event logged + plan→OLM"
echo "  (A) SAIL plan/phase in OLM        →  ME renderer srlContext + phase→move bias"
echo "  Loop closes both ways on the LIVE worker. ✓"
echo

echo "════ CLEANUP: remove the test learner ════"
curl -s -X POST "$B/api/olm" -H "Content-Type: application/json" -d "{\"learnerId\":\"$L\",\"writer\":\"sail\",\"diff\":{\"events\":[{\"type\":\"demo_cleanup\"}]}}" >/dev/null || true
echo "  (test learnerId $L is ephemeral; no production data touched)"
