#!/usr/bin/env python3
"""
EDEN & CO. Marketing Intelligence Cache Builder
Pulls data from 4 key Typeform forms and writes src/data/marketing-cache.js
Run: python3 scripts/build-marketing-cache.py

Forms:
  AxBUWMZz  Gift Designer (Lead Gen)
  P8H6VegM  Virgin Experience Vouchers
  D0PGh6hl  Corporate (Lead Gen)
  jbw36b3O  Google Reviews (Oct 2025)
"""

import json, time, os, sys
from datetime import datetime, timezone
from collections import Counter

try:
    import urllib.request, urllib.parse
except ImportError:
    print("Python 3 required"); sys.exit(1)

TOKEN     = os.environ.get("TYPEFORM_TOKEN", "")
BASE      = "https://api.typeform.com"
OUT_FILE  = os.path.join(os.path.dirname(__file__), "../src/data/marketing-cache.js")

FORMS = {
    "gift_designer":  "AxBUWMZz",
    "virgin":         "P8H6VegM",
    "corporate":      "D0PGh6hl",
    "google_reviews": "jbw36b3O",
}

# ── Field UUIDs ───────────────────────────────────────────────────────────────
GD = {
    "who":      "82f3d75d-2071-4354-8e7e-f30bfc6e6ad7",
    "feel":     "02229cc4-3c0c-4331-8e89-7df8014a88b7",
    "concern":  "e78d4025-92e5-4b24-b71c-cfb162ab9ae6",
    "matters":  "17f854a7-d328-4689-8d6c-7d7aff121503",
    "product":  "3b4f408b-4dad-4b41-9383-be811da2025d",
    "occasion": "afd098b0-0b19-4887-b722-fa009c1c4591",
    "dietary":  "cd5c25dc-5f6d-4b8e-afea-edf1d7b48058",
}

VIR = {
    "product":  "a7011790-378e-4443-969f-50e8777957e1",
    "card":     "5d7f8554-1c7e-44f8-8baf-a5bfa88c9faa",
    "upsell":   "057d7fef-1604-483e-aabd-c823634c9049",
    "dietary1": "ae8fcb2a-2777-4c14-8ece-1b7861977548",
    "dietary2": "4c5bf01d-a7c0-4544-86ba-e64aca2356b5",
}

CORP = {
    "qty":       "59d54b6b-4a4d-418c-a6d7-1aef268497af",
    "budget":    "5c7fddab-0539-4670-b67f-76c0decba24b",
    "occasion":  "9d1bf2e9-c20c-41cb-bb4a-83f44175a085",
    "dietary":   "cd5c25dc-5f6d-4b8e-afea-edf1d7b48058",
    "branded":   "a9dde609-2f99-4078-9ed4-5df54849a2a1",
    "decision":  "99dccd93-99d6-4c16-862e-bc60249bd5fb",
    "readiness": "213813c0-b16e-4f83-8431-f72251c50a84",
}

GR = {
    "rating_quality":    "874def6d-c19a-4b09-b2c6-53a5eca60a43",
    "rating_impression": "801cef6e-dcc7-471f-9c7c-10eac85e5856",
    "dietary":           "bd1adb57-3d94-471e-9ba5-cb7a38a1fb8d",
    "missed_food":       "8668a514-1ef0-4e32-a87b-acf99e7df3bf",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def api(path):
    url = BASE + path
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def fetch_responses(form_id, page_size=1000):
    data = api(f"/forms/{form_id}/responses?page_size={page_size}")
    items = data.get("items", [])
    total = data.get("total_items", len(items))
    return items, total

def agg_choices(items, ref):
    c = Counter()
    for item in items:
        for ans in item.get("answers", []):
            if ans["field"]["ref"] != ref: continue
            t = ans.get("type", "")
            if t == "choice":
                v = (ans.get("choice") or {}).get("label", "")
                if v: c[v] += 1
            elif t == "choices":
                for v in (ans.get("choices") or {}).get("labels", []) or []:
                    c[v] += 1
    return dict(c.most_common())

def agg_numbers(items, ref):
    vals = []
    for item in items:
        for ans in item.get("answers", []):
            if ans["field"]["ref"] == ref and ans.get("type") == "number":
                vals.append(ans["number"])
    return vals

def agg_bool(items, ref):
    c = Counter()
    for item in items:
        for ans in item.get("answers", []):
            if ans["field"]["ref"] == ref and ans.get("type") == "boolean":
                c["Yes" if ans["boolean"] else "No"] += 1
    return dict(c)

def month_counts(items):
    c = Counter()
    for item in items:
        m = (item.get("submitted_at") or "")[:7]
        if m: c[m] += 1
    return dict(sorted(c.items()))

# ── Pull data ─────────────────────────────────────────────────────────────────
print("EDEN & CO. Marketing Cache Builder")
print("=" * 40)

result = {}

# 1. Gift Designer
print("\n[1/4] Gift Designer (AxBUWMZz)...")
gd_items, gd_total = fetch_responses(FORMS["gift_designer"])
n = len(gd_items)
print(f"  {gd_total} total | {n} fetched")

result["gift_designer"] = {
    "total": gd_total,
    "fetched": n,
    "who":      agg_choices(gd_items, GD["who"]),
    "feel":     agg_choices(gd_items, GD["feel"]),
    "concern":  agg_choices(gd_items, GD["concern"]),
    "matters":  agg_choices(gd_items, GD["matters"]),
    "product":  agg_choices(gd_items, GD["product"]),
    "occasion": agg_choices(gd_items, GD["occasion"]),
    "dietary":  agg_choices(gd_items, GD["dietary"]),
    "months":   month_counts(gd_items),
}

time.sleep(1)

# 2. Virgin
print("\n[2/4] Virgin Experience Vouchers (P8H6VegM)...")
vir_items, vir_total = fetch_responses(FORMS["virgin"])
n = len(vir_items)
print(f"  {vir_total} total | {n} fetched")

d1 = agg_choices(vir_items, VIR["dietary1"])
d2 = agg_choices(vir_items, VIR["dietary2"])
vir_dietary = Counter(d1) + Counter(d2)

result["virgin"] = {
    "total":   vir_total,
    "fetched": n,
    "product": agg_choices(vir_items, VIR["product"]),
    "card":    agg_choices(vir_items, VIR["card"]),
    "upsell":  agg_choices(vir_items, VIR["upsell"]),
    "dietary": dict(vir_dietary.most_common()),
    "months":  month_counts(vir_items),
}

time.sleep(1)

# 3. Corporate
print("\n[3/4] Corporate Lead Gen (D0PGh6hl)...")
corp_items, corp_total = fetch_responses(FORMS["corporate"])
n = len(corp_items)
print(f"  {corp_total} total | {n} fetched")

qty_vals   = agg_numbers(corp_items, CORP["qty"])
read_vals  = agg_numbers(corp_items, CORP["readiness"])
qty_sorted = sorted(qty_vals)

result["corporate"] = {
    "total":     corp_total,
    "fetched":   n,
    "budget":    agg_choices(corp_items, CORP["budget"]),
    "occasion":  agg_choices(corp_items, CORP["occasion"]),
    "dietary":   agg_choices(corp_items, CORP["dietary"]),
    "branded":   agg_bool(corp_items, CORP["branded"]),
    "decision":  agg_bool(corp_items, CORP["decision"]),
    "qty_median": qty_sorted[len(qty_sorted)//2] if qty_sorted else 0,
    "qty_mean":   round(sum(qty_vals)/len(qty_vals)) if qty_vals else 0,
    "qty_max":    max(qty_vals) if qty_vals else 0,
    "readiness_avg": round(sum(read_vals)/len(read_vals), 1) if read_vals else 0,
    "months":    month_counts(corp_items),
}

time.sleep(1)

# 4. Google Reviews form
print("\n[4/4] Google Reviews form (jbw36b3O)...")
gr_items, gr_total = fetch_responses(FORMS["google_reviews"])
n = len(gr_items)
print(f"  {gr_total} total | {n} fetched")

q_ratings   = agg_numbers(gr_items, GR["rating_quality"])
i_ratings   = agg_numbers(gr_items, GR["rating_impression"])

def rating_summary(vals):
    if not vals: return {}
    dist = Counter(vals)
    total = len(vals)
    return {
        "avg": round(sum(vals)/total, 2),
        "total": total,
        "five":  dist.get(5, 0),
        "four":  dist.get(4, 0),
        "three": dist.get(3, 0),
        "two":   dist.get(2, 0),
        "one":   dist.get(1, 0),
        "pct_positive": round((dist.get(5,0)+dist.get(4,0))/total*100, 1),
    }

missed_foods = []
for item in gr_items:
    for ans in item.get("answers", []):
        if GR["missed_food"] in ans["field"]["ref"] and ans.get("type") == "text":
            t = (ans.get("text") or "").strip()
            if t and len(t) > 3: missed_foods.append(t)

result["google_reviews"] = {
    "total":      gr_total,
    "fetched":    n,
    "quality":    rating_summary(q_ratings),
    "impression": rating_summary(i_ratings),
    "dietary":    agg_choices(gr_items, GR["dietary"]),
    "missed_foods": missed_foods[:100],
    "months":     month_counts(gr_items),
}

# ── Google Business Profile reviews (from live Google Sheet via Make)
# Sheet: https://docs.google.com/spreadsheets/d/1DXKumasfRDY4tGiPAi07pV15eiyAb5R0HezoxpUkhc8
# Tab: All Google Reviews (gid=879421801) — full all-time dataset
# Updated: 2026-03-29 | 673 reviews | 4.67 avg | 79% five-star
result["gbp_reviews"] = {
    "source":       "Google Business Profile via Make → Google Sheet (All Google Reviews tab)",
    "sheet_url":    "https://docs.google.com/spreadsheets/d/1DXKumasfRDY4tGiPAi07pV15eiyAb5R0HezoxpUkhc8/edit?gid=879421801",
    "last_updated": "2026-03-29",
    "total":        673,
    "avg_rating":   4.67,
    "five_star":    532,
    "four_star":    78,
    "three_star":   41,
    "two_star":     0,
    "one_star":     22,
    "pct_five":     79,
    "pct_positive": 91,
    "dietary_mentions": {
        "Vegan":       122,
        "Gluten Free": 47,
        "Dairy Free":  8,
        "Coeliac":     6,
    },
    "top_phrases": [
        "Lovely gift",
        "Beautiful/beautifully packaged",
        "Delicious",
        "Wonderful",
        "Thank you",
        "Vegan",
        "Treats",
        "Quality",
        "Special",
        "Delivery/quick delivery",
        "Gluten free",
        "Variety",
        "Pleased/delighted",
        "Great selection",
        "Impressed",
    ],
    "top_quotes": [
        {
            "text": "I usually have to watch other people eating treats because they've not thought about my allergies — this time the whole hamper was curated for me!",
            "reviewer": "Adrienne Ayres",
            "stars": 5,
            "theme": "dietary exclusion resolved"
        },
        {
            "text": "She was able to eat everything and raved about how much she enjoyed the beautiful hamper.",
            "reviewer": "Kathy Richards",
            "stars": 5,
            "theme": "recipient joy"
        },
        {
            "text": "Their faces light up every time they open the box.",
            "reviewer": "Michelle Tilson",
            "stars": 5,
            "theme": "gifting emotion"
        },
        {
            "text": "I'm obsessed! The whole hamper was curated for my coeliac disease.",
            "reviewer": "Molie Honeyman",
            "stars": 5,
            "theme": "personalisation + inclusion"
        },
        {
            "text": "Recently learnt he is now dairy and gluten intolerant — this was a great indulgent gift.",
            "reviewer": "Tim Weston",
            "stars": 5,
            "theme": "new diagnosis gifting"
        },
        {
            "text": "Now this is the kind of gift I like to receive! Some of the best vegan chocolate I have ever tasted.",
            "reviewer": "AJ Sefton",
            "stars": 5,
            "theme": "quality surprise"
        },
        {
            "text": "Having those who need to eat gluten free feel normal and included for a change.",
            "stars": 5,
            "theme": "inclusion"
        },
        {
            "text": "These hampers are the most gorgeous gift for a dairy free gal. They really make it feel like I'm not missing out.",
            "stars": 5,
            "theme": "inclusion"
        },
    ],
    "watch_areas": [
        "Fulfilment failures: 22 one-star reviews, mostly citing non-delivery or missing items at Christmas",
        "Taste expectations vs price: value perception raised in 3-star reviews",
        "May-contain labelling: 'may contain gluten' warning on GF orders flagged by customers",
        "Sender identification: some recipients did not know who sent the gift",
    ],
    "peak_month": "December 2025 (majority of reviews)",
}

# ── Metadata ──────────────────────────────────────────────────────────────────
result["_built"]   = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
result["_version"] = "1.0"

# ── Write JS cache ────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
js = f"// EDEN & CO. Marketing Intelligence Cache\n// Built: {result['_built']}\n// Run: python3 scripts/build-marketing-cache.py\n\nwindow.EDEN = window.EDEN || {{}};\nwindow.EDEN._marketingData = {json.dumps(result, indent=2)};\n"
with open(OUT_FILE, "w") as f:
    f.write(js)

size_kb = os.path.getsize(OUT_FILE) // 1024
print(f"\n{'='*40}")
print(f"Written {OUT_FILE} ({size_kb} KB)")
print(f"Built:  {result['_built']}")
print("\nSummary:")
print(f"  Gift Designer:   {result['gift_designer']['total']} responses")
print(f"  Virgin:          {result['virgin']['total']} responses")
print(f"  Corporate:       {result['corporate']['total']} responses")
print(f"  Google Reviews:  {result['google_reviews']['total']} responses")
print(f"\nReload the dashboard to see updated data.")
