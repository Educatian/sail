#!/usr/bin/env bash
# OLM live cross-app demo: ME (micro) writes to the shared Open Learner Model on the
# deployed SAIL worker; SAIL (macro) reads it back via the review scheduler and Marin.
# Proves micro->macro synergy + single-writer field-ownership guard on the LIVE deployment.
#
# Run:  bash scripts/olm_live_demo.sh
# Requires: curl, node. No auth (public worker). Uses a fresh learnerId each run.
set -euo pipefail
B="${SAIL_API:-https://sail-api.jewoong-moon.workers.dev}"
L="olm-demo-$(date +%s)"
echo "Worker:   $B"
echo "learnerId: $L"
echo

assemble() { # read an SSE stream on stdin, print concatenated text deltas
  node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const o=[];for(const ln of d.split(/\r?\n/)){const m=ln.match(/^data: (.*)$/);if(m){try{const v=JSON.parse(m[1]);if(typeof v==="string")o.push(v)}catch{}}}process.stdout.write(o.join(""))})'
}

echo "STEP 1 - ME writes 'confounder' calibration/confusion/beta to the shared OLM"
curl -s -X POST "$B/api/olm" -H "Content-Type: application/json" -d "{\"learnerId\":\"$L\",\"writer\":\"me\",\"diff\":{\"concept_id\":\"confounder\",\"set\":{\"calibration_err\":0.42,\"jol_trend\":\"overconfident\",\"confusion_label\":\"impasse\",\"beta\":{\"a\":2,\"b\":5},\"voi\":{\"comp\":{\"a\":2,\"b\":5}}},\"events\":[{\"type\":\"metacog_experience\",\"feeling\":\"confidence\",\"value\":4,\"phase\":\"pre\"}]}}"
echo; echo

echo "STEP 2 - SAIL tries to overwrite an ME-owned field (single-writer guard should REJECT)"
curl -s -X POST "$B/api/olm" -H "Content-Type: application/json" -d "{\"learnerId\":\"$L\",\"writer\":\"sail\",\"diff\":{\"concept_id\":\"confounder\",\"set\":{\"calibration_err\":0.99}}}"
echo; echo

echo "STEP 3 - read back OLM (ME fields persisted; SAIL write absent)"
curl -s "$B/api/olm?learnerId=$L"
echo; echo

echo "STEP 4 - SAIL review queue derived from ME's latent Beta belief + forgetting drift"
curl -s "$B/api/review?learnerId=$L"
echo; echo

echo "STEP 5 - SAIL Marin surfaces the shared-OLM signal in conversation"
curl -s -X POST "$B/api/marin/chat" -H "Content-Type: application/json" \
  -d "{\"mode\":\"ask\",\"studentId\":\"$L\",\"messages\":[{\"role\":\"user\",\"content\":\"Based on my recent problem practice, which concept am I weakest or most overconfident on, and what should I do about it?\"}]}" \
  | assemble
echo
