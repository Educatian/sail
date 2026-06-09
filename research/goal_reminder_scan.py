"""Ground the achievement-goal + reminder + course-spine design."""
import requests, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE="https://api.openalex.org/works"; MAIL="jewoong.moon@gmail.com"
P = {
 "goal_setting_theory": '"goal setting" AND (Locke OR Latham) AND (performance OR motivation)',
 "proximal_distal_goals": '("proximal goals" OR "proximal subgoals" OR "goal proximity") AND (self-efficacy OR learning OR motivation)',
 "implementation_intentions": '"implementation intentions" AND (Gollwitzer OR "if-then" OR goal)',
 "spacing_effect": '"spacing effect" AND (retention OR learning OR practice)',
 "reminders_prompts_learning": '("reminder" OR "prompt") AND ("self-regulated learning" OR "study behavior" OR procrastination)',
 "achievement_goal_orientation": '"achievement goal" AND (mastery OR performance) AND orientation',
 "lms_analytics_srl": '("learning management system" OR Canvas OR Moodle) AND "self-regulated learning" AND (analytics OR data)',
 "subgoal_scaffolding": '"subgoal" AND (scaffolding OR "worked example" OR learning)',
}
def probe(s):
    p={"filter":f"title_and_abstract.search:{s}","per-page":3,"sort":"cited_by_count:desc","mailto":MAIL}
    d=requests.get(BASE,params=p,timeout=60).json()
    return d["meta"]["count"], [{"y":w.get("publication_year"),"c":w.get("cited_by_count"),
        "a":[x["author"]["display_name"] for x in (w.get("authorships") or [])][:2],"t":w.get("title")} for w in d["results"]]
for k,s in P.items():
    cnt,top=probe(s)
    print(f"\n[{k}] count={cnt}")
    for t in top: print(f"   ({t['y']}, c={t['c']}) {', '.join(t['a'])} — {t['t']}")
    time.sleep(0.3)
