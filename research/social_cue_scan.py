"""Ground the social-cue / social-comparison coaching design in literature."""
import requests, sys, io, time, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE="https://api.openalex.org/works"; MAIL="jewoong.moon@gmail.com"
def deinvert(inv):
    if not inv: return ""
    pos={}; [pos.__setitem__(i,w) for w,idxs in inv.items() for i in idxs]
    return " ".join(pos[i] for i in sorted(pos))
P = {
 "social_comparison_learning": '"social comparison" AND (learning OR achievement OR motivation)',
 "vicarious_modeling_srl": '("modeling" OR "vicarious") AND "self-regulated learning"',
 "zimmerman_social_levels": '"self-regulated learning" AND (observation OR emulation) AND modeling',
 "normative_feedback": '"normative feedback" OR "social norm" AND feedback AND (study OR learning OR behavior)',
 "social_comparison_backfire": '"social comparison" AND (demotivation OR anxiety OR "performance goal" OR harmful)',
 "social_learning_analytics": '"social learning analytics" OR ("learning analytics" AND "social comparison")',
 "co_regulation_srl": '("co-regulation" OR "socially shared regulation") AND learning',
 "social_comparison_dashboard": '("learning dashboard" OR "open learner model") AND ("social comparison" OR comparison)',
 "descriptive_norms_behavior": '"descriptive norms" AND behavior change',
}
def probe(s, abst=False):
    p={"filter":f"title_and_abstract.search:{s}","per-page":4,"sort":"cited_by_count:desc","mailto":MAIL}
    d=requests.get(BASE,params=p,timeout=60).json()
    out=[]
    for w in d["results"]:
        a=[x["author"]["display_name"] for x in (w.get("authorships") or [])][:3]
        item={"y":w.get("publication_year"),"c":w.get("cited_by_count"),"a":a,"t":w.get("title")}
        if abst: item["abs"]=deinvert(w.get("abstract_inverted_index"))[:500]
        out.append(item)
    return d["meta"]["count"], out
for k,s in P.items():
    cnt,top=probe(s, abst=(k in ("social_comparison_backfire","normative_feedback","vicarious_modeling_srl")))
    print(f"\n[{k}] count={cnt}")
    for t in top[:3]:
        print(f"   ({t['y']}, c={t['c']}) {', '.join(t['a'])} — {t['t']}")
        if t.get("abs"): print(f"       {t['abs'][:240]}")
    time.sleep(0.3)
