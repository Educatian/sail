"""Enrich the key anchor works with authors + venue for citation."""
import requests, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE="https://api.openalex.org/works"; MAIL="jewoong.moon@gmail.com"

ANCHORS = {
 "metacog_laziness": '"metacognitive laziness" AND "generative artificial intelligence"',
 "design_principles_chatbot_srl": '"Educational Design Principles" AND "AI Chatbot" AND "Self-Regulated Learning"',
 "mCALS": '"mCALS" OR ("Mobile Context-aware and Adaptive Learning Schedule")',
 "time_will_tell": '"Time will tell" AND "mobile learning analytics"',
 "mobile_chatbot_flipped": '"Mobile-based artificial intelligence chatbot for self-regulated learning"',
 "help_seeking_cognitive_tutor": '"Toward Meta-cognitive Tutoring"',
 "chatgpt_srl_pilot": '"Empowering student self-regulated learning" AND ChatGPT',
}
def one(s):
    p={"filter":f"title_and_abstract.search:{s}","per-page":1,"sort":"cited_by_count:desc","mailto":MAIL}
    d=requests.get(BASE,params=p,timeout=60).json()
    if not d["results"]: return None
    w=d["results"][0]
    auth=[a["author"]["display_name"] for a in (w.get("authorships") or [])][:4]
    src=((w.get("primary_location") or {}).get("source") or {})
    return {"title":w.get("title"),"year":w.get("publication_year"),
            "cited":w.get("cited_by_count"),"authors":auth,
            "venue":src.get("display_name"),"doi":w.get("doi")}
out={k:one(s) for k,s in ANCHORS.items()}
for k,v in out.items():
    if v: print(f"{k}: {', '.join(v['authors'])} ({v['year']}). {v['title']}. {v['venue']} [cit={v['cited']}]")
    else: print(f"{k}: NOT FOUND")
json.dump(out,open("C:/Users/jewoo/Projects/sail/research/anchors.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)
