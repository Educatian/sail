"""Ground a 'stretch coach' that maximizes metacognitive EXPERIENCES (Flavell/Efklides)."""
import requests, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE="https://api.openalex.org/works"; MAIL="jewoong.moon@gmail.com"
P = {
 "flavell_metacog_experiences": '"metacognitive experiences" AND (Flavell OR monitoring OR feeling)',
 "efklides_masrl": '"metacognitive experiences" AND ("self-regulated learning" OR affect OR feelings) AND (Efklides OR MASRL OR model)',
 "metacog_feelings": '("feeling of knowing" OR "feeling of difficulty" OR "feeling of confidence" OR "judgment of learning")',
 "desirable_difficulties": '"desirable difficulties" AND (learning OR memory OR retention)',
 "productive_failure": '"productive failure" OR "productive struggle"',
 "zpd_optimal_challenge": '("zone of proximal development" OR "optimal challenge") AND (scaffolding OR learning)',
 "confusion_learning": '"confusion" AND learning AND (productive OR "deep learning" OR affect)',
 "calibration_monitoring": '("metacognitive monitoring" OR calibration) AND (accuracy OR feedback) AND learning',
}
def probe(s):
    p={"filter":f"title_and_abstract.search:{s}","per-page":3,"sort":"cited_by_count:desc","mailto":MAIL}
    d=requests.get(BASE,params=p,timeout=60).json()
    return d["meta"]["count"], [{"y":w.get("publication_year"),"c":w.get("cited_by_count"),
        "a":[x["author"]["display_name"] for x in (w.get("authorships") or [])][:2],"t":w.get("title")} for w in d["results"]]
for k,s in P.items():
    cnt,top=probe(s); print(f"\n[{k}] count={cnt}")
    for t in top: print(f"   ({t['y']}, c={t['c']}) {', '.join(t['a'])} — {t['t']}")
    time.sleep(0.3)
