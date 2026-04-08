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

# Current month prefix for MTD filtering (e.g. "2026-04")
NOW         = datetime.now(timezone.utc)
MTD_PREFIX  = NOW.strftime('%Y-%m')

def is_mtd(date_str):
    """Return True if date string starts with current YYYY-MM."""
    if not date_str:
        return False
    # Handle formats: 2026-04-07, 2026-04-07T00:00:00Z, 07/04/2026, April 7 2026
    s = str(date_str).strip()
    # ISO format
    if s[:7] == MTD_PREFIX:
        return True
    # DD/MM/YYYY
    try:
        parts = s.split('/')
        if len(parts) == 3:
            d = datetime(int(parts[2][:4]), int(parts[1]), int(parts[0]))
            return d.strftime('%Y-%m') == MTD_PREFIX
    except Exception:
        pass
    return False

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
    # Coupler Google Ads columns: 'Cost: Amount spend', 'Performance: Clicks',
    # 'Performance: Impressions', 'Conversions: Conversions'
    spend_col = next((k for k in rows[0] if 'amount spend' in k.lower() or ('spend' in k.lower() and 'cost' in k.lower())), None) if rows else None
    if not spend_col:
        spend_col = next((k for k in rows[0] if 'spend' in k.lower()), None) if rows else None
    clicks_col = next((k for k in rows[0] if k.lower() in ('performance: clicks', 'clicks')), None) if rows else None
    conv_col = next((k for k in rows[0] if 'conversions: conversions' in k.lower() or k.lower() == 'conversions'), None) if rows else None
    impr_col = next((k for k in rows[0] if 'impress' in k.lower()), None) if rows else None

    date_col_g = next((k for k in rows[0] if k.lower() in ('report: date', 'report:date', 'date')), None) if rows else None
    mtd_rows_g = [r for r in rows if is_mtd(r.get(date_col_g,''))] if date_col_g else rows
    print(f'[Google] {len(rows)} total rows → {len(mtd_rows_g)} MTD rows (col: {date_col_g})')
    total_spend = sum(clean(r.get(spend_col,0)) for r in mtd_rows_g) if spend_col else 0
    total_clicks = sum(clean(r.get(clicks_col,0)) for r in mtd_rows_g) if clicks_col else 0
    total_conv = sum(clean(r.get(conv_col,0)) for r in mtd_rows_g) if conv_col else 0
    total_impr = sum(clean(r.get(impr_col,0)) for r in mtd_rows_g) if impr_col else 0

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
    mtd_rows_a = [r for r in rows if is_mtd(r.get('date',''))]
    print(f'[Amazon] {len(rows)} total rows → {len(mtd_rows_a)} MTD rows')
    total_spend   = sum(clean(r.get('cost',0)) for r in mtd_rows_a)
    total_clicks  = sum(clean(r.get('clicks',0)) for r in mtd_rows_a)
    total_orders  = sum(clean(r.get('purchases14d',0)) for r in mtd_rows_a)
    total_impr    = sum(clean(r.get('impressions',0)) for r in mtd_rows_a)
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

    date_col_m = next((k for k in rows[0] if k.lower() in ('report: date', 'report:date', 'date')), None) if rows else None
    mtd_rows_m = [r for r in rows if is_mtd(r.get(date_col_m,''))] if date_col_m else rows
    print(f'[Meta] {len(rows)} total rows → {len(mtd_rows_m)} MTD rows (col: {date_col_m})')
    total_spend  = sum(clean(r.get(spend_col,0)) for r in mtd_rows_m) if spend_col else 0
    total_clicks = sum(clean(r.get(clicks_col,0)) for r in mtd_rows_m) if clicks_col else 0
    total_impr   = sum(clean(r.get(impr_col,0)) for r in mtd_rows_m) if impr_col else 0

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
