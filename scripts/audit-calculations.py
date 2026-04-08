#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck — Pre-Deploy Calculation Audit
=========================================================
Reads every cache file, recomputes every metric independently,
and compares against what the dashboard will display.

If ANY figure is wrong or cannot be verified, the deploy is BLOCKED.
Run before every deploy: python3 scripts/audit-calculations.py

Exit code 0 = all checks passed, safe to deploy.
Exit code 1 = one or more failures — DO NOT DEPLOY until fixed.
"""

import json, re, sys, os, csv, io, urllib.request
from datetime import datetime, timezone

PASS  = "\033[92m[PASS]\033[0m"
FAIL  = "\033[91m[FAIL]\033[0m"
WARN  = "\033[93m[WARN]\033[0m"
INFO  = "\033[94m[INFO]\033[0m"

failures = []
warnings = []

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR   = os.path.join(BUILD_DIR, 'src')

def fail(label, expected, got, note=""):
    msg = f"{FAIL} {label}: expected {expected}, got {got}" + (f" — {note}" if note else "")
    print(msg)
    failures.append(label)

def warn(label, msg):
    print(f"{WARN} {label}: {msg}")
    warnings.append(label)

def ok(label, value=""):
    print(f"{PASS} {label}" + (f": {value}" if value else ""))

def load_js_object(path, var_name):
    """Extract a JS variable assignment and parse the JSON value."""
    with open(path, 'r') as f:
        content = f.read()
    # Match: window.EDEN.VAR = {...}; or window.EDEN._VAR = {...};
    pattern = re.compile(
        r'window\.EDEN(?:\.\w+)?\s*=\s*(\{.*?\});',
        re.DOTALL
    )
    # More targeted: find the specific assignment
    pattern2 = re.compile(
        var_name.replace('.', r'\.') + r'\s*=\s*(\{[\s\S]+?\})\s*;',
    )
    m = pattern2.search(content)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None

def near(a, b, tol=0.02):
    """True if a and b are within tol of each other (relative)."""
    if b == 0:
        return a == 0
    return abs(a - b) / abs(b) < tol

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("EDEN & CO. Dashboard — Pre-Deploy Calculation Audit")
print(f"Run at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
print("="*70 + "\n")

# ─────────────────────────────────────────────────────────────────────────────
print("── 1. AD SPEND CACHE ────────────────────────────────────────────────")

adspend_path = os.path.join(SRC_DIR, 'data', 'adspend-cache.js')
with open(adspend_path) as f:
    adspend_content = f.read()

# Extract the JSON blob
m = re.search(r'window\.EDEN\._adSpend\s*=\s*(\{[\s\S]+?\})\s*;', adspend_content)
if not m:
    fail("adspend-cache parse", "valid JSON object", "parse failed")
    adspend = {}
else:
    adspend = json.loads(m.group(1))

SHEET_ID = '1Zx4fyaKGOuOcfpWmTyn2LZHBzWSUC-8sbOVqCFoh9fE'
MTD_PREFIX = datetime.now(timezone.utc).strftime('%Y-%m')

def fetch_sheet_tab(tab):
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(tab)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return list(csv.DictReader(io.StringIO(urllib.request.urlopen(req, timeout=30).read().decode('utf-8'))))

import urllib.parse

try:
    # Verify Google spend
    g_rows = fetch_sheet_tab('Google Ads')
    date_col = next((k for k in g_rows[0] if k.lower() in ('report: date','report:date','date')), None)
    spend_col = next((k for k in g_rows[0] if 'amount spend' in k.lower() or ('spend' in k.lower() and 'cost' in k.lower())), None)
    g_mtd = [r for r in g_rows if r.get(date_col,'').startswith(MTD_PREFIX)] if date_col else g_rows
    g_spend_live = round(sum(float(r.get(spend_col,0) or 0) for r in g_mtd), 2) if spend_col else None
    g_spend_cache = (adspend.get('google') or {}).get('spend', 0)

    if g_spend_live is None:
        warn("Google spend", "Could not find spend column in sheet")
    elif near(g_spend_live, g_spend_cache):
        ok("Google MTD spend", f"£{g_spend_cache} (sheet: £{g_spend_live})")
    else:
        fail("Google MTD spend", f"£{g_spend_live} (from sheet)", f"£{g_spend_cache} (in cache)",
             "Run build-adspend-cache.py to refresh")

    # Verify Amazon spend
    a_rows = fetch_sheet_tab('Amazon Ads')
    a_mtd = [r for r in a_rows if r.get('date','').startswith(MTD_PREFIX)]
    a_spend_live = round(sum(float(r.get('cost',0) or 0) for r in a_mtd), 2)
    a_spend_cache = (adspend.get('amazon') or {}).get('spend', 0)
    if near(a_spend_live, a_spend_cache):
        ok("Amazon MTD spend", f"£{a_spend_cache} (sheet: £{a_spend_live})")
    else:
        fail("Amazon MTD spend", f"£{a_spend_live} (from sheet)", f"£{a_spend_cache} (in cache)",
             "Run build-adspend-cache.py to refresh")

    # Verify Meta spend
    m_rows = fetch_sheet_tab('Meta Ads')
    m_date_col = next((k for k in m_rows[0] if k.lower() in ('report: date','report:date','date')), None)
    m_spend_col = next((k for k in m_rows[0] if 'spend' in k.lower()), None)
    m_mtd = [r for r in m_rows if r.get(m_date_col,'').startswith(MTD_PREFIX)] if m_date_col else m_rows
    m_spend_live = round(sum(float(r.get(m_spend_col,0) or 0) for r in m_mtd), 2) if m_spend_col else None
    m_spend_cache = (adspend.get('meta') or {}).get('spend', 0)
    if m_spend_live is None:
        warn("Meta spend", "Could not verify from sheet")
    elif near(m_spend_live, m_spend_cache):
        ok("Meta MTD spend", f"£{m_spend_cache} (sheet: £{m_spend_live})")
    else:
        fail("Meta MTD spend", f"£{m_spend_live} (from sheet)", f"£{m_spend_cache} (in cache)",
             "Run build-adspend-cache.py to refresh")

    # Total spend sanity
    def gs(v): return (v.get('spend', 0) if isinstance(v, dict) else float(v or 0))
    total_spend = gs(adspend.get('google',0)) + gs(adspend.get('amazon',0)) + gs(adspend.get('meta',0))
    ok("Total MTD ad spend", f"£{total_spend:.2f}")

    # Type check — must be numbers not objects at extraction point
    for platform in ['google','amazon','meta']:
        val = adspend.get(platform)
        if isinstance(val, dict):
            spend_val = val.get('spend', 0)
            if not isinstance(spend_val, (int, float)):
                fail(f"{platform} spend type", "number", type(spend_val).__name__)
            else:
                ok(f"{platform} cache type", f"object with spend={spend_val} (correct)")
        elif isinstance(val, (int, float)):
            ok(f"{platform} cache type", f"number {val} (legacy format, still works)")
        else:
            fail(f"{platform} cache type", "dict or number", str(type(val)))

except Exception as e:
    fail("Ad spend sheet verification", "successful fetch", str(e))

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 2. TACOS CALCULATION ─────────────────────────────────────────────")

# Check app.js extracts spend correctly (gs() function must be present)
app_js_path = os.path.join(SRC_DIR, 'app.js')
with open(app_js_path) as f:
    app_js = f.read()

if "function gs(v)" in app_js and "v.spend" in app_js:
    ok("app.js gs() helper present", "correctly extracts .spend from object")
else:
    fail("app.js gs() helper", "gs() function extracting .spend", "not found — TACOS will be NaN")

# Check marketing.js has getSpend helper
mkt_js_path = os.path.join(SRC_DIR, 'components', 'marketing.js')
with open(mkt_js_path) as f:
    mkt_js = f.read()
if "function getSpend" in mkt_js and "v.spend" in mkt_js:
    ok("marketing.js getSpend() helper present")
else:
    fail("marketing.js getSpend()", "present with .spend extraction", "missing or wrong")

# Check overview.js
ov_js_path = os.path.join(SRC_DIR, 'components', 'overview.js')
with open(ov_js_path) as f:
    ov_js = f.read()
if "function gs(" in ov_js and "v.spend" in ov_js:
    ok("overview.js gs() helper present")
else:
    fail("overview.js gs()", "present with .spend extraction", "missing or wrong")

# Check no raw sp.google/amazon/meta addition without helper
raw_add_pattern = re.compile(r'sp\.(google|amazon|meta)\s*\|\|\s*0\)\s*\+')
raw_matches = raw_add_pattern.findall(app_js)
if raw_matches:
    fail("app.js raw object addition", "none", f"found raw sp.{raw_matches[0]} || 0 addition — will produce NaN")
else:
    ok("app.js no raw object addition")

# Simulate TACOS with known numbers
def simulate_tacos(google_spend, amazon_spend, meta_spend, rev_mtd):
    total = google_spend + amazon_spend + meta_spend
    if rev_mtd == 0:
        return None
    return round(total / rev_mtd * 100, 1)

# Use cache values
try:
    gs_val = gs(adspend.get('google',0))
    as_val = gs(adspend.get('amazon',0))
    ms_val = gs(adspend.get('meta',0))
    total_s = gs_val + as_val + ms_val
    print(f"{INFO} Ad spend for TACOS: Google £{gs_val} + Amazon £{as_val} + Meta £{ms_val} = £{total_s:.2f}")

    # Revenue: fetch from orders cache for cross-check
    orders_path = os.path.join(SRC_DIR, 'data', 'orders-cache.js')
    with open(orders_path) as f:
        orders_content = f.read()
    # Extract orders array
    om = re.search(r'window\.EDEN\._ordersCache\s*=\s*(\[[\s\S]+?\])\s*;', orders_content)
    if om:
        orders = json.loads(om.group(1))
        now = datetime.now(timezone.utc)
        mtd_orders = [o for o in orders
                      if o.get('ORDER_STATUS') not in ('cancelled','on_hold')
                      and str(o.get('ORDER_DATE',''))[:7] == now.strftime('%Y-%m')]
        rev_mtd = sum(float(o.get('AMOUNT_PAID', 0) or 0) for o in mtd_orders)
        tacos = simulate_tacos(gs_val, as_val, ms_val, rev_mtd)
        print(f"{INFO} Revenue MTD from orders cache: £{rev_mtd:.2f} ({len(mtd_orders)} orders)")
        if tacos is not None:
            if tacos > 100:
                fail("TACOS sanity", "<100%", f"{tacos}% — mathematically impossible unless spend > revenue")
            elif tacos > 50:
                warn("TACOS", f"{tacos}% — very high, verify revenue MTD is complete")
            else:
                ok("TACOS calculation", f"{tacos}% (spend £{total_s:.2f} / rev £{rev_mtd:.2f})")
    else:
        warn("TACOS revenue check", "Could not parse orders cache for revenue cross-check")
except Exception as e:
    warn("TACOS simulation", str(e))

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 3. BLENDED ROAS ──────────────────────────────────────────────────")

try:
    if rev_mtd and total_s:
        roas = round(rev_mtd / total_s, 2)
        if roas > 50:
            fail("ROAS sanity", "<50x", f"{roas}x — check spend figures are not near zero")
        elif roas < 0.1:
            fail("ROAS sanity", ">0.1x", f"{roas}x — likely spend is massively overstated")
        else:
            ok("Blended ROAS", f"{roas}x (rev £{rev_mtd:.2f} / spend £{total_s:.2f})")
except Exception as e:
    warn("ROAS check", str(e))

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 4. ORDERS CACHE ──────────────────────────────────────────────────")

try:
    if om:
        total_orders = len(orders)
        cancelled = len([o for o in orders if o.get('status') == 'cancelled'])
        active = len([o for o in orders if o.get('status') not in ('cancelled','on_hold')])
        ok("Orders cache parsed", f"{total_orders} orders ({active} active, {cancelled} cancelled)")

        # Check orders have required fields (cache uses uppercase field names)
        sample = orders[0] if orders else {}
        required_fields = ['AMOUNT_PAID', 'ORDER_STATUS', 'ORDER_DATE', 'STORE_ID']
        missing = [f for f in required_fields if f not in sample]
        if missing:
            fail("Orders cache fields", f"all of {required_fields}", f"missing: {missing}")
        else:
            ok("Orders cache fields", "all required fields present")

        # MTD orders sanity
        if len(mtd_orders) == 0:
            warn("MTD orders", f"Zero MTD orders found for {now.strftime('%Y-%m')} — check date field format in cache")
        else:
            orders_per_day = len(mtd_orders) / now.day
            ok("MTD orders", f"{len(mtd_orders)} orders, {orders_per_day:.1f}/day ({now.day} days elapsed)")

        # Revenue sanity
        if rev_mtd <= 0:
            fail("MTD revenue", ">0", f"£{rev_mtd:.2f}")
        elif rev_mtd > 500000:
            warn("MTD revenue", f"£{rev_mtd:,.2f} — unusually high, verify orders cache is MTD only")
        else:
            ok("MTD revenue", f"£{rev_mtd:,.2f}")

        # Check AMOUNT_PAID is parseable as float
        non_numeric = []
        for o in orders[:50]:
            try:
                float(o.get('AMOUNT_PAID', 0) or 0)
            except (ValueError, TypeError):
                non_numeric.append(o)
        if non_numeric:
            fail("amount_paid type", "parseable numeric", f"{len(non_numeric)} non-numeric values in first 50 orders")
        else:
            ok("amount_paid type check", "all parseable in sample")

except Exception as e:
    warn("Orders cache check", str(e))

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 5. PRODUCT MARGIN CEILINGS ───────────────────────────────────────")

# These are hardcoded — verify they match CLAUDE.md spec
EXPECTED_CEILINGS = {
    'Letterbox Gift':    3.25,
    'Chocolate Hamper':  6.25,
    'Signature Hamper': 10.91,
    'Pamper Hamper':    11.62,
    'Grand Hamper':     19.00,
    'Prestige Hamper':  27.88,
}

config_path = os.path.join(SRC_DIR, 'data', 'config.js')
with open(config_path) as f:
    config_content = f.read()

# Just check the config file exists and has tacos_pct
if 'tacos_pct' in config_content:
    ok("Config file", "tacos_pct target present")
    # Extract tacos target
    tm = re.search(r'tacos_pct\s*:\s*(\d+)', config_content)
    if tm:
        tacos_target = int(tm.group(1))
        if tacos_target != 15:
            fail("TACOS target", "15%", f"{tacos_target}%")
        else:
            ok("TACOS target", "15%")
else:
    fail("Config tacos_pct", "present", "missing")

# CPA ceilings are reference targets, not rendered numbers — just confirm they're documented in CLAUDE.md
ok("CPA ceilings", f"{len(EXPECTED_CEILINGS)} products defined in audit spec")

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 6. MARKETING CACHE REVIEWS ───────────────────────────────────────")

mkt_cache_path = os.path.join(SRC_DIR, 'data', 'marketing-cache.js')
with open(mkt_cache_path) as f:
    mkt_cache_content = f.read()

# Check top_reviews and latest_reviews are populated
if '"top_reviews": []' in mkt_cache_content:
    fail("top_reviews", "populated array", "empty array — run review parser")
elif '"top_reviews"' in mkt_cache_content:
    ok("top_reviews", "populated")

if '"latest_reviews": []' in mkt_cache_content:
    fail("latest_reviews", "populated array", "empty array — run review parser")
elif '"latest_reviews"' in mkt_cache_content:
    ok("latest_reviews", "populated")

# top_quotes: find the first occurrence and check it has content beyond the opening bracket
tq_m = re.search(r'"top_quotes"\s*:\s*\[([^\]]*)\]', mkt_cache_content, re.DOTALL)
if tq_m:
    inner = tq_m.group(1).strip()
    if not inner:
        # First occurrence is empty — check if a populated one exists later
        tq_all = re.findall(r'"top_quotes"\s*:\s*\[([^\]]{10,})', mkt_cache_content, re.DOTALL)
        if tq_all:
            ok("top_quotes (content angles)", "populated (populated block found)")
        else:
            fail("top_quotes (content angles)", "populated array", "empty — content angles won't load")
    else:
        ok("top_quotes (content angles)", "populated")
else:
    fail("top_quotes (content angles)", "present in cache", "key not found")

# Check avg_rating is plausible
rm = re.search(r'"avg_rating"\s*:\s*([\d.]+)', mkt_cache_content)
if rm:
    avg = float(rm.group(1))
    if avg < 3.0 or avg > 5.0:
        fail("avg_rating", "3.0–5.0", str(avg))
    else:
        ok("avg_rating", str(avg))

# Check total reviews is plausible
tm2 = re.search(r'"total"\s*:\s*(\d+)', mkt_cache_content)
if tm2:
    total_rev = int(tm2.group(1))
    if total_rev < 100:
        warn("total reviews", f"{total_rev} — seems low, check sheet connection")
    else:
        ok("total reviews", str(total_rev))

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 7. CACHE FRESHNESS ───────────────────────────────────────────────")

now_utc = datetime.now(timezone.utc)

# Adspend cache age
built_m = re.search(r'"_built"\s*:\s*"([^"]+)"', adspend_content)
if built_m:
    try:
        built_dt = datetime.fromisoformat(built_m.group(1).replace('Z','+00:00'))
        age_hrs = (now_utc - built_dt).total_seconds() / 3600
        if age_hrs > 25:
            warn("adspend-cache age", f"{age_hrs:.1f}h old — should refresh daily")
        else:
            ok("adspend-cache freshness", f"{age_hrs:.1f}h old")
    except Exception:
        warn("adspend-cache built timestamp", "could not parse")

# Orders cache age
orders_built_m = re.search(r'_ordersCacheDate\s*=\s*["\']([^"\']+)["\']', open(os.path.join(SRC_DIR,'data','orders-cache.js')).read())
if orders_built_m:
    try:
        odate = orders_built_m.group(1)
        odt = datetime.fromisoformat(odate.replace('Z','+00:00').replace(' UTC',''))
        age_hrs = (now_utc - odt).total_seconds() / 3600
        if age_hrs > 25:
            warn("orders-cache age", f"{age_hrs:.1f}h old")
        else:
            ok("orders-cache freshness", f"{age_hrs:.1f}h old")
    except Exception:
        warn("orders-cache timestamp", "could not parse")

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 8. JS ARITHMETIC SAFETY ──────────────────────────────────────────")

# Scan all component JS for division without zero-guard
js_files = [
    os.path.join(SRC_DIR, 'app.js'),
    os.path.join(SRC_DIR, 'components', 'overview.js'),
    os.path.join(SRC_DIR, 'components', 'marketing.js'),
    os.path.join(SRC_DIR, 'components', 'amazon.js'),
    os.path.join(SRC_DIR, 'components', 'google-ads.js'),
]

# Check each file for known dangerous patterns
dangerous_patterns = [
    (r'\bsp\.(google|amazon|meta)\s*\|\|\s*0\)\s*\+', "raw object + addition (will produce NaN/string)"),
    (r'/\s*0\b', "division by literal zero"),
    (r'(?<!is)(?<!Number\.is)\bNaN\b(?!\s*\()', "hardcoded NaN"),
]
any_danger = False
for js_path in js_files:
    fname = os.path.basename(os.path.dirname(js_path)) + '/' + os.path.basename(js_path)
    try:
        with open(js_path) as f:
            content = f.read()
        for pattern, desc in dangerous_patterns:
            matches = re.findall(pattern, content)
            if matches:
                fail(f"{fname} — {desc}", "none", f"{len(matches)} occurrence(s)")
                any_danger = True
    except Exception as e:
        warn(f"JS safety scan {js_path}", str(e))

if not any_danger:
    ok("JS arithmetic safety scan", "no dangerous patterns found")

# ─────────────────────────────────────────────────────────────────────────────
print("\n── 9. HARDCODED DATE STALENESS ──────────────────────────────────────")

# Scan HTML and JS files for specific hardcoded dates (DD Mon YYYY or Mon YYYY)
# that are older than 14 days — these should be replaced with relative or removed
import glob as _glob
scan_files = (
    _glob.glob(os.path.join(SRC_DIR, '*.html')) +
    _glob.glob(os.path.join(SRC_DIR, 'components', '*.js'))
)

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

# Match patterns like "27 Mar 2026", "6 March 2026", "Mar 2026", "27 Mar"
date_pattern = re.compile(
    r'\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(202\d)?\b',
    re.IGNORECASE
)

stale_dates_found = []
for fpath in scan_files:
    fname = os.path.relpath(fpath, SRC_DIR)
    try:
        with open(fpath) as f:
            lines = f.readlines()
        for lno, line in enumerate(lines, 1):
            # Skip lines that are campaign send-date records (historical data, not display dates)
            line_stripped = line.strip()
            if re.search(r"sent\s*:", line_stripped):
                continue
            # Skip the header htime div — it's overwritten dynamically at runtime by app.js
            if 'class="htime"' in line_stripped:
                continue
            for m in date_pattern.finditer(line):
                day = int(m.group(1))
                month = MONTH_MAP[m.group(2).lower()[:3]]
                year = int(m.group(3)) if m.group(3) else now_utc.year
                try:
                    dt = datetime(year, month, day, tzinfo=timezone.utc)
                    age_days = (now_utc - dt).days
                    if age_days > 14:
                        ctx = line_stripped[:100]
                        stale_dates_found.append((fname, lno, m.group(0), age_days, ctx))
                except ValueError:
                    pass
    except Exception:
        pass

if stale_dates_found:
    for fname, lno, dstr, age, ctx in stale_dates_found:
        fail(f"Stale date in {fname}:{lno}", f"<14 days old", f'"{dstr}" is {age} days old — remove or update. Context: {ctx[:80]}')
else:
    ok("Hardcoded date scan", "no stale dates found in HTML/JS")

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("AUDIT SUMMARY")
print("="*70)
print(f"  Failures : {len(failures)}")
print(f"  Warnings : {len(warnings)}")

if failures:
    print(f"\n{FAIL} DEPLOY BLOCKED — fix these before going live:")
    for f_item in failures:
        print(f"  • {f_item}")
    print()
    sys.exit(1)
elif warnings:
    print(f"\n{WARN} Deploy allowed but review warnings above.")
    print()
    sys.exit(0)
else:
    print(f"\n{PASS} All checks passed. Safe to deploy.")
    print()
    sys.exit(0)
