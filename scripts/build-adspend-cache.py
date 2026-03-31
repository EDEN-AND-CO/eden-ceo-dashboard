#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck — Ad Spend Cache Builder
Reads Coupler CSV exports and writes src/data/adspend-cache.js

Sources:
  Google Ads: data/google-ads/google-ads-weekly-log.csv  (Coupler daily export)
  Amazon:     data/meta/Sponsored_Products_Campaign_report.csv  (Coupler daily export)

Run: python3 scripts/build-adspend-cache.py
"""
import csv, json, os, sys
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR  = os.path.dirname(SCRIPT_DIR)
DATA_DIR   = os.path.normpath(os.path.join(BUILD_DIR, '..', '..', '..', 'data'))
OUT_PATH   = os.path.join(BUILD_DIR, 'src', 'data', 'adspend-cache.js')

GOOGLE_CSV = os.path.join(DATA_DIR, 'google-ads', 'google-ads-weekly-log.csv')
AMAZON_CSV = os.path.join(DATA_DIR, 'meta', 'Sponsored_Products_Campaign_report.csv')

result = {}

# ── Google Ads ────────────────────────────────────────────────────────────────
if os.path.exists(GOOGLE_CSV):
    mtime = os.path.getmtime(GOOGLE_CSV)
    file_date = datetime.fromtimestamp(mtime, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    rows = []
    with open(GOOGLE_CSV, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if r.get('date_pulled','').strip()]
    if rows:
        latest = sorted(rows, key=lambda r: r['date_pulled'])[-1]
        result['google'] = {
            'spend_30d':  float(latest.get('30d_spend',0) or 0),
            'conv_30d':   float(latest.get('30d_conv',0) or 0),
            'cpa_30d':    float(latest.get('30d_cpa',0) or 0),
            'roas_30d':   float(latest.get('30d_roas',0) or 0),
            'revenue_30d':float(latest.get('30d_conv_value',0) or 0),
            'spend_7d':   float(latest.get('7d_spend',0) or 0),
            'roas_7d':    float(latest.get('7d_roas',0) or 0),
            'notes':      latest.get('notes','').strip(),
            'data_date':  latest.get('date_pulled','').strip(),
        }
        result['google_updated'] = file_date
        print(f'[OK] Google Ads: {latest["date_pulled"]} | 30d spend £{latest["30d_spend"]} | ROAS {latest["30d_roas"]}')
    else:
        print('[WARN] Google Ads CSV empty')
else:
    print(f'[WARN] Google Ads CSV not found: {GOOGLE_CSV}')

# ── Amazon Ads ────────────────────────────────────────────────────────────────
if os.path.exists(AMAZON_CSV):
    mtime = os.path.getmtime(AMAZON_CSV)
    file_date = datetime.fromtimestamp(mtime, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    total_spend = 0.0
    total_sales = 0.0
    total_clicks = 0
    total_orders = 0
    rows_read = 0
    with open(AMAZON_CSV, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                spend_raw = row.get('Spend','').replace('£','').replace(',','').strip()
                sales_raw = row.get('7 Day Total Sales','').replace('£','').replace(',','').strip()
                clicks_raw = row.get('Clicks','').replace(',','').strip()
                orders_raw = row.get('7 Day Total Orders (#)','').replace(',','').strip()
                if spend_raw:
                    total_spend += float(spend_raw)
                if sales_raw:
                    total_sales += float(sales_raw)
                if clicks_raw:
                    total_clicks += int(float(clicks_raw))
                if orders_raw:
                    total_orders += int(float(orders_raw))
                rows_read += 1
            except (ValueError, KeyError):
                continue
    acos = round(total_spend / total_sales * 100, 1) if total_sales > 0 else 0
    roas = round(total_sales / total_spend, 2) if total_spend > 0 else 0
    result['amazon'] = {
        'spend':   round(total_spend, 2),
        'sales':   round(total_sales, 2),
        'clicks':  total_clicks,
        'orders':  total_orders,
        'acos':    acos,
        'roas':    roas,
        'rows':    rows_read,
    }
    result['amazon_updated'] = file_date
    print(f'[OK] Amazon: {rows_read} campaign rows | spend £{total_spend:.2f} | ACOS {acos}% | ROAS {roas}')
else:
    print(f'[WARN] Amazon CSV not found: {AMAZON_CSV}')

# ── Meta placeholder (no CSV yet) ─────────────────────────────────────────────
# When Coupler adds Meta export, point META_CSV here and parse similarly.
# result['meta_updated'] will remain unset until then.
print('[INFO] Meta: no CSV configured — set META_CSV path when Coupler export is available')

# ── Write ──────────────────────────────────────────────────────────────────────
generated = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
result['_built'] = generated

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(f"""// EDEN & CO. CEO Flight Deck — Ad Spend Cache
// Generated: {generated}
// Sources: Coupler CSV exports (Google Ads, Amazon)
// Do not edit manually. Run: python3 scripts/build-adspend-cache.py

window.EDEN = window.EDEN || {{}};
window.EDEN._adSpend = {json.dumps(result, indent=2)};
""")

print(f'[OK] Written: {OUT_PATH}')
