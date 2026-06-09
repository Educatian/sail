"""
OpenAlex literature scan for SAIL novelty/impact positioning.
Probes the concept intersections that define a context/spatial-aware SRL mobile LLM mentor.
No API key needed; uses the polite pool via mailto.
"""
import requests, json, time, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "https://api.openalex.org/works"
MAIL = "jewoong.moon@gmail.com"

# Each probe: a label + a search string. We capture count + top-cited + recent works.
PROBES = {
    # --- established literatures (the THESIS bodies) ---
    "srl_mobile_app":              '"self-regulated learning" AND mobile AND app',
    "mall_mobile_assisted_lang":   '"mobile-assisted language learning" AND "self-regulated"',
    "context_aware_learning":      '"context-aware" AND learning AND ("mobile" OR "ubiquitous")',
    "ubiquitous_seamless_learning":'"seamless learning" OR "ubiquitous learning"',
    "place_based_learning":        '"place-based learning" OR "location-based learning"',
    "mobile_learning_analytics":   '"learning analytics" AND mobile AND "self-regulated"',
    "multimodal_la":               '"multimodal learning analytics" AND "self-regulated learning"',
    # --- AI / LLM tutor for SRL (rising THESIS) ---
    "llm_srl":                     '("large language model" OR "generative AI" OR "ChatGPT") AND "self-regulated learning"',
    "ai_tutor_metacognition":      '("AI tutor" OR "intelligent tutoring") AND metacognition',
    "ai_help_seeking":             '("help-seeking" OR "help seeking") AND ("AI" OR "chatbot" OR "intelligent tutoring")',
    "scaffolding_fading_its":      '"scaffolding" AND "fading" AND ("intelligent tutoring" OR "self-regulated learning")',
    "calibration_jol":             '("calibration" OR "judgment of learning") AND "self-regulated learning"',
    # --- the NOVELTY intersection (likely sparse = the GAP) ---
    "spatial_srl":                 '("spatial" OR "location" OR "geolocation" OR "place") AND "self-regulated learning"',
    "context_srl_mobile":          '"context-aware" AND "self-regulated learning"',
    "llm_context_aware_tutor":     '("large language model" OR "generative AI") AND "context-aware" AND (tutor OR mentor OR learning)',
    "study_location_achievement":  '("study location" OR "learning space" OR "study environment") AND ("self-regulation" OR "self-regulated learning")',
}

def probe(label, search):
    params = {
        "search": search,
        "per-page": 5,
        "sort": "cited_by_count:desc",
        "mailto": MAIL,
    }
    r = requests.get(BASE, params=params, timeout=60)
    r.raise_for_status()
    d = r.json()
    count = d["meta"]["count"]
    top = []
    for w in d["results"]:
        top.append({
            "title": w.get("title"),
            "year": w.get("publication_year"),
            "cited": w.get("cited_by_count"),
            "venue": (w.get("primary_location") or {}).get("source", {}) and ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
            "id": w.get("id"),
        })
    # recent (2023+) top works for currency
    params2 = dict(params)
    params2["filter"] = "from_publication_date:2023-01-01"
    params2["sort"] = "cited_by_count:desc"
    r2 = requests.get(BASE, params=params2, timeout=60)
    d2 = r2.json()
    recent_count = d2["meta"]["count"]
    recent = []
    for w in d2["results"][:4]:
        recent.append({
            "title": w.get("title"),
            "year": w.get("publication_year"),
            "cited": w.get("cited_by_count"),
        })
    return {"count": count, "recent_count_2023plus": recent_count, "top_cited": top, "recent_top": recent}

results = {}
for label, search in PROBES.items():
    try:
        results[label] = probe(label, search)
        c = results[label]["count"]; rc = results[label]["recent_count_2023plus"]
        print(f"[{label}] total={c}  2023+={rc}")
        for t in results[label]["top_cited"][:3]:
            print(f"     - ({t['year']}, cit={t['cited']}) {t['title']}")
    except Exception as e:
        print(f"[{label}] ERROR {e}")
        results[label] = {"error": str(e)}
    time.sleep(0.4)

with open("C:/Users/jewoo/Projects/sail/research/openalex_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("\nSaved openalex_results.json")
