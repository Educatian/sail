"""
OpenAlex v2 — tight boolean via title_and_abstract.search filter.
Measures the intersection gap that defines SAIL's novelty.
"""
import requests, json, time, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "https://api.openalex.org/works"
MAIL = "jewoong.moon@gmail.com"

# title_and_abstract.search supports AND/OR/quoted phrases with strict matching
PROBES = {
    # broad established bodies
    "A_srl":                       '"self-regulated learning"',
    "B_srl_mobile":                '"self-regulated learning" AND "mobile learning"',
    "C_context_aware_learning":    '"context-aware learning"',
    "D_ubiquitous_learning":       '"ubiquitous learning" OR "seamless learning"',
    "E_genai_srl":                 '("generative AI" OR "large language model" OR "ChatGPT") AND "self-regulated learning"',
    "F_ai_tutor_metacog":          '("intelligent tutoring" OR "AI tutor") AND metacognition',
    "G_help_seeking_ai":           '"help-seeking" AND ("chatbot" OR "intelligent tutoring" OR "generative AI")',
    "H_scaffold_fading":           '"scaffolding" AND "fading"',
    "I_calibration_srl":           '("judgment of learning" OR "metacognitive calibration") AND "self-regulated learning"',
    # NOVELTY intersections (the gap)
    "X1_spatial_srl":              '("location-based" OR "geolocation" OR "spatial context") AND "self-regulated learning"',
    "X2_context_aware_srl":        '"context-aware" AND "self-regulated learning"',
    "X3_study_location_srl":       '("study location" OR "learning space" OR "study environment") AND "self-regulated learning"',
    "X4_genai_context_aware_tutor":'("generative AI" OR "large language model") AND "context-aware" AND (tutor OR mentor OR scaffold)',
    "X5_mobile_genai_srl":         '("generative AI" OR "large language model" OR "chatbot") AND "self-regulated learning" AND mobile',
    "X6_spatial_genai_learning":   '("location" OR "spatial" OR "place") AND ("generative AI" OR "large language model") AND "self-regulated learning"',
    "X7_context_aware_la_srl":     '"context-aware" AND "learning analytics" AND "self-regulated"',
}

def probe(search):
    params = {"filter": f"title_and_abstract.search:{search}",
              "per-page": 6, "sort": "cited_by_count:desc", "mailto": MAIL}
    r = requests.get(BASE, params=params, timeout=60); r.raise_for_status()
    d = r.json()
    top = [{"title": w.get("title"), "year": w.get("publication_year"),
            "cited": w.get("cited_by_count")} for w in d["results"]]
    # recent currency
    p2 = dict(params); p2["filter"] = f"title_and_abstract.search:{search},from_publication_date:2024-01-01"
    p2["sort"]="cited_by_count:desc"
    d2 = requests.get(BASE, params=p2, timeout=60).json()
    rec = [{"title": w.get("title"), "year": w.get("publication_year"),
            "cited": w.get("cited_by_count")} for w in d2["results"][:4]]
    return {"count": d["meta"]["count"], "count_2024plus": d2["meta"]["count"],
            "top_cited": top, "recent": rec}

results={}
for label, s in PROBES.items():
    try:
        results[label]=probe(s)
        print(f"[{label}] total={results[label]['count']}  2024+={results[label]['count_2024plus']}")
        for t in results[label]["top_cited"][:3]:
            print(f"     - ({t['year']}, cit={t['cited']}) {t['title']}")
    except Exception as e:
        print(f"[{label}] ERROR {e}"); results[label]={"error":str(e)}
    time.sleep(0.4)

with open("C:/Users/jewoo/Projects/sail/research/openalex_results2.json","w",encoding="utf-8") as f:
    json.dump(results,f,ensure_ascii=False,indent=2)
print("\nSaved openalex_results2.json")
