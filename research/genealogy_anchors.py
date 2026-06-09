"""Anchor the 1950s-2020s theoretical genealogy with real OpenAlex works."""
import requests, json, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE="https://api.openalex.org/works"; MAIL="jewoong.moon@gmail.com"

# (label, search phrase, year hint to disambiguate)
Q = [
 ("cybernetics_wiener",        '"Cybernetics" AND "control and communication"'),
 ("miller_TOTE_plans",         '"Plans and the Structure of Behavior"'),
 ("skinner_teaching_machines", '"Teaching Machines" AND Skinner'),
 ("flavell_metamemory",        '"metamemory" AND Flavell'),
 ("flavell_metacognition_1979",'"Metacognition and cognitive monitoring"'),
 ("bandura_social_foundations",'"Social Foundations of Thought and Action"'),
 ("bandura_self_efficacy_1977",'"Self-efficacy: toward a unifying theory of behavioral change"'),
 ("vygotsky_mind_society",     '"Mind in Society" AND Vygotsky'),
 ("brown_collins_duguid_1989", '"Situated Cognition and the Culture of Learning"'),
 ("lave_wenger_1991",          '"Situated Learning" AND "Legitimate Peripheral Participation"'),
 ("zimmerman_1989_srl",        '"A social cognitive view of self-regulated academic learning"'),
 ("zimmerman_2000_cyclical",   '"Attaining self-regulation" AND "social cognitive perspective"'),
 ("pintrich_mslq_1990",        '"motivational and self-regulated learning components"'),
 ("pintrich_2000_framework",   '"The role of goal orientation in self-regulated learning"'),
 ("winne_hadwin_1998",         '"Studying as self-regulated learning"'),
 ("nelson_narens_metamemory",  '"Metamemory: A theoretical framework and new findings"'),
 ("hutchins_distributed",      '"Cognition in the Wild"'),
 ("tabuenca_2015",             '"Time will tell" AND "mobile learning analytics"'),
 ("fan_2024_laziness",         '"metacognitive laziness" AND "generative artificial intelligence"'),
]
def one(s):
    p={"filter":f"title_and_abstract.search:{s}","per-page":1,"sort":"cited_by_count:desc","mailto":MAIL}
    d=requests.get(BASE,params=p,timeout=60).json()
    if not d["results"]: return None
    w=d["results"][0]
    a=[x["author"]["display_name"] for x in (w.get("authorships") or [])][:3]
    return {"title":w.get("title"),"year":w.get("publication_year"),
            "cited":w.get("cited_by_count"),"authors":a}
out={}
for k,s in Q:
    try:
        out[k]=one(s)
        v=out[k]
        if v: print(f"{v['year']} | cit={v['cited']:>6} | {', '.join(v['authors'])} — {v['title']}")
        else: print(f"---- | {k}: NOT FOUND")
    except Exception as e:
        print(f"ERR {k}: {e}")
    time.sleep(0.3)
json.dump(out,open("C:/Users/jewoo/Projects/sail/research/genealogy_anchors.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)
