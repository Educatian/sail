"""
Positive-necessity evidence scan (not gap-spotting):
1) Is 'environmental structuring' / 'regulation of context' a CORE SRL construct? (canon)
2) Is study environment/place empirically tied to SRL/achievement/procrastination? (it matters)
3) Is retrospective self-report of SRL invalid vs trace/in-situ? (current method is broken)
4) Does EMA / experience sampling beat retrospective for in-context constructs? (the fix exists)
5) Context-dependent memory (place affects cognition).
"""
import requests, json, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE="https://api.openalex.org/works"; MAIL="jewoong.moon@gmail.com"

def deinvert(inv):
    if not inv: return ""
    pos={}
    for w,idxs in inv.items():
        for i in idxs: pos[i]=w
    return " ".join(pos[i] for i in sorted(pos))

PROBES = {
 # 1) canon: environmental structuring as SRL strategy
 "env_structuring_srl":     '"environmental structuring" AND "self-regulated learning"',
 "srlis_martinez_pons":     '"Self-Regulated Learning Interview" OR "strategies to self-regulate"',
 "pintrich_context_regulation":'"regulation of context" AND "self-regulated learning"',
 # 2) it matters empirically
 "study_environment_achievement":'"study environment" AND (achievement OR procrastination OR "academic performance")',
 "learning_space_behavior":  '"learning space" AND ("study behavior" OR "self-regulation" OR engagement)',
 "procrastination_environment":'procrastination AND ("study environment" OR "physical environment" OR distraction)',
 # 3) current method (self-report) is weak
 "selfreport_srl_validity":  '("self-report" OR questionnaire) AND "self-regulated learning" AND (validity OR "trace data" OR discrepancy OR bias)',
 "winne_trace_vs_selfreport":'"self-regulated learning" AND "trace data" AND (calibration OR measurement)',
 "veenman_metacog_measurement":'metacognition AND measurement AND (offline OR online OR "self-report") AND validity',
 # 4) the fix: EMA / experience sampling captures in-context
 "ema_learning":            '("ecological momentary assessment" OR "experience sampling") AND (learning OR studying OR "self-regulation")',
 "context_aware_assessment": '"context-aware" AND assessment AND (learner OR student OR learning)',
 # 5) place affects cognition
 "context_dependent_memory": '"context-dependent memory" OR "encoding specificity"',
}
def probe(s, want_abs=False):
    p={"filter":f"title_and_abstract.search:{s}","per-page":5,"sort":"cited_by_count:desc","mailto":MAIL}
    d=requests.get(BASE,params=p,timeout=60).json()
    res=[]
    for w in d["results"]:
        a=[x["author"]["display_name"] for x in (w.get("authorships") or [])][:3]
        item={"title":w.get("title"),"year":w.get("publication_year"),
              "cited":w.get("cited_by_count"),"authors":a}
        if want_abs: item["abstract"]=deinvert(w.get("abstract_inverted_index"))[:600]
        res.append(item)
    return {"count":d["meta"]["count"],"top":res}

out={}
for k,s in PROBES.items():
    out[k]=probe(s, want_abs=(k in ("selfreport_srl_validity","ema_learning","env_structuring_srl")))
    print(f"\n[{k}] count={out[k]['count']}")
    for t in out[k]["top"][:3]:
        print(f"   ({t['year']}, cit={t['cited']}) {', '.join(t['authors'])} — {t['title']}")
    time.sleep(0.3)
json.dump(out,open("C:/Users/jewoo/Projects/sail/research/necessity.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)
print("\nsaved necessity.json")
