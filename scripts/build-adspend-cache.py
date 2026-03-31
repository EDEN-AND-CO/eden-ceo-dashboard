#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck — Ad Spend Cache Builder
Reads Google Ads, Amazon Ads, Meta Ads tabs from Stock Tracker Google Sheet
Coupler refreshes all three tabs daily at 9am.
Run: python3 scripts/build-adspend-cache.py
"""
import csv, json, os, io, urllib.request, urllib.parse
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR  = os.path.dirname(SCRIPT_DIR)
OUT_PATH   = os.path.join(BUILD_DIR, 'src', 'data', 'adspend-cache.js')
SHEET_ID   = '1Zx4fyaKGOuOcfpWmTyn2LZHBzWSUC-8sbOVqCFoh9fE'

def fetch_tab(tab):
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(tab)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return list(csv.DictReader(io.StringIO(urllib.request.urlopen(req, timeout=30).read().decode('utf-8'))))

def clean(v):
    if v is None: return 0.0
    return float(str(v).replace('£','').replace('%','').replace(',','').strip() or 0)

result = {}
ts_now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# ── Google Ads ────────────────────────────────────────────────────────────────
try:
    rows = fetch_tab('Google Ads')
    # Cols: Row Updated At, Account, Account Id, Report: Date, Campaign name, Campaign Id,
    #       Campaign status, Ad group Id, Ad group name, Ad group status, ...
    # Find spend/clicks/conv cols
    updated = rows[0].get('Row Updated At','') if rows else ''
    spend_col = next((k for k in rows[0] if 'spend' in k.lower() or 'cost' in k.lower()), None) if rows else None
    clicks_col = next((k for k in rows[0] if k.lower() == 'clicks'), None) if rows else None
    conv_col = next((k for k in rows[0] if 'conv' in k.lower()), None) if rows else None
    impr_col = next((k for k in rows[0] if 'impress' in k.lower()), None) if rows else None

    total_spend = sum(clean(r.get(spend_col,0)) for r in rows) if spend_col else 0
    total_clicks = sum(clean(r.get(clicks_col,0)) for r in rows) if clicks_col else 0
    total_conv = sum(clean(r.get(conv_col,0)) for r in rows) if conv_col else 0
    total_impr = sum(clean(r.get(impr_col,0)) for r in rows) if impr_col else 0

    result['google'] = {
        'spend': round(total_spend, 2),
        'clicks': int(total_clicks),
        'conversions': round(total_conv, 1),
        'impressions': int(total_impr),
        'rows': len(rows),
        'spend_col': spend_col,
    }
    result['google_updated'] = updated or ts_now
    print(f'[OK] Google Ads: {len(rows)} rows | spend £{total_spend:.2f} | clicks {int(total_clicks)} | conv {total_conv:.1f}')
except Exception as e:
    print(f'[WARN] Google Ads failed: {e}')

# ── Amazon Ads ────────────────────────────────────────────────────────────────
try:
    rows = fetch_tab('Amazon Ads')
    # Cols: Row Updated At, account, adGroupId, adGroupName, campaignId, campaignName,
    #       clickThroughRate, clicks, cost, costPerClick, date, impressions, keyword,
    #       purchases14d, searchTerm, targeting
    updated = rows[0].get('Row Updated At','') if rows else ''
    total_spend   = sum(clean(r.get('cost',0)) for r in rows)
    total_clicks  = sum(clean(r.get('clicks',0)) for r in rows)
    total_orders  = sum(clean(r.get('purchases14d',0)) for r in rows)
    total_impr    = sum(clean(r.get('impressions',0)) for r in rows)
    # Amazon doesn't give revenue directly in this feed — calc ACOS from spend/orders
    result['amazon'] = {
        'spend': round(total_spend, 2),
        'clicks': int(total_clicks),
        'orders': int(total_orders),
        'impressions': int(total_impr),
        'rows': len(rows),
    }
    result['amazon_updated'] = updated or ts_now
    print(f'[OK] Amazon Ads: {len(rows)} rows | spend £{total_spend:.2f} | clicks {int(total_clicks)} | orders {int(total_orders)}')
except Exception as e:
    print(f'[WARN] Amazon Ads failed: {e}')

# ── Meta Ads ──────────────────────────────────────────────────────────────────
try:
    rows = fetch_tab('Meta Ads')
    # Cols: Row Updated At, Account name, Report: Date, Campaign Id, Campaign name,
    #       Clicks: CTR, Cost: Amount spend, Cost: CPC, Cost: CPM,
    #       Performance: Clicks, Performance: Impressions, Performance: Reach ...
    updated = rows[0].get('Row Updated At','') if rows else ''
    spend_col = next((k for k in rows[0] if 'spend' in k.lower()), None) if rows else None
    clicks_col = next((k for k in rows[0] if k.lower() in ('performance: clicks','clicks')), None) if rows else None
    impr_col = next((k for k in rows[0] if 'impressions' in k.lower()), None) if rows else None

    total_spend  = sum(clean(r.get(spend_col,0)) for r in rows) if spend_col else 0
    total_clicks = sum(clean(r.get(clicks_col,0)) for r in rows) if clicks_col else 0
    total_impr   = sum(clean(r.get(impr_col,0)) for r in rows) if impr_col else 0

    result['meta'] = {
        'spend': round(total_spend, 2),
        'clicks': int(total_clicks),
        'impressions': int(total_impr),
        'rows': len(rows),
        'spend_col': spend_col,
    }
    result['meta_updated'] = updated or ts_now
    print(f'[OK] Meta Ads: {len(rows)} rows | spend £{total_spend:.2f} | clicks {int(total_clicks)}')
except Exception as e:
    print(f'[WARN] Meta Ads failed: {e}')

result['_built'] = ts_now

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(f"""// EDEN & CO. CEO Flight Deck — Ad Spend Cache
// Generated: {ts_now}
// Source: Stock Tracker Google Sheet — Coupler (Google Ads, Amazon Ads, Meta Ads tabs)
window.EDEN = window.EDEN || {{}};
window.EDEN._adSpend = {json.dumps(result, indent=2)};
""")
print(f'[OK] Written {OUT_PATH}')
