"""Fetch abstracts of nearest-neighbor works for a feature-level differentiation table."""
import requests, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE="https://api.openalex.org/works"; MAIL="jewoong.moon@gmail.com"

NEIGHBORS = {
 "Han2025_mobile_chatbot_flipped": '"Mobile-based artificial intelligence chatbot for self-regulated learning"',
 "Ng2024_chatgpt_srl_pilot": '"Empowering student self-regulated learning" AND ChatGPT',
 "Chang2023_design_principles": '"Educational Design Principles" AND "AI Chatbot" AND "Self-Regulated Learning"',
 "Fan2024_laziness": '"metacognitive laziness" AND "generative artificial intelligence"',
 "Tabuenca2015_mobile_la": '"Time will tell" AND "mobile learning analytics"',
}
def deinvert(inv):
    if not inv: return ""
    pos={}
    for word,idxs in inv.items():
        for i in idxs: pos[i]=word
    return " ".join(pos[i] for i in sorted(pos))
def one(s):
    p={"filter":f"title_and_abstract.search:{s}","per-page":1,"sort":"cited_by_count:desc","mailto":MAIL}
    d=requests.get(BASE,params=p,timeout=60).json()
    if not d["results"]: return None
    w=d["results"][0]
    a=[x["author"]["display_name"] for x in (w.get("authorships") or [])][:5]
    src=((w.get("primary_location") or {}).get("source") or {})
    return {"title":w.get("title"),"year":w.get("publication_year"),"authors":a,
            "venue":src.get("display_name"),"cited":w.get("cited_by_count"),
            "abstract":deinvert(w.get("abstract_inverted_index"))}
out={}
for k,s in NEIGHBORS.items():
    out[k]=one(s); v=out[k]
    print(f"\n=== {k} ===")
    if v:
        print(f"{', '.join(v['authors'])} ({v['year']}). {v['venue']} [cit={v['cited']}]")
        print(v["abstract"][:1100])
    else: print("NOT FOUND")
json.dump(out,open("C:/Users/jewoo/Projects/sail/research/neighbors.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)
