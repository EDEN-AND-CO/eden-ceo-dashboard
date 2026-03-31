#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck — Klaviyo Cache Builder
Pulls flow and campaign metrics from Klaviyo REST API v2024-10-15
Run: KLAVIYO_API_KEY=pk_xxx python3 scripts/build-klaviyo-cache.py
"""
import json, os, sys, io
from datetime import datetime, timezone, timedelta

try:
    import urllib.request, urllib.parse
except ImportError:
    print("Python 3 required"); sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR  = os.path.dirname(SCRIPT_DIR)
OUT_PATH   = os.path.join(BUILD_DIR, 'src', 'data', 'klaviyo-cache.js')

API_KEY    = os.environ.get('KLAVIYO_API_KEY', '')
BASE       = 'https://a.klaviyo.com/api'
HEADERS    = {
    'Authorization': f'Klaviyo-API-Key {API_KEY}',
    'revision':      '2024-10-15',
    'Accept':        'application/json',
}

if not API_KEY:
    print('[ERROR] KLAVIYO_API_KEY not set')
    sys.exit(1)

def get(path, params=None):
    url = BASE + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f'[ERROR] {path}: {e.code} {body[:200]}')
        return None

def fmt_gbp(v):
    return round(float(v or 0), 2)

result = { 'flows': [], 'campaigns': [], '_built': '' }

# ── Flows ─────────────────────────────────────────────────────────────────────
print('[INFO] Fetching flows...')
flows_resp = get('/flows', {'page[size]': 50, 'sort': '-updated'})
if flows_resp:
    flows = flows_resp.get('data', [])
    print(f'  {len(flows)} flows found')
    for flow in flows[:20]:  # top 20
        fid   = flow['id']
        fname = flow['attributes'].get('name', 'Unknown')
        fstat = flow['attributes'].get('status', '')

        # Get flow metrics (last 30 days)
        metrics_resp = get(f'/flows/{fid}/flow-messages', {'page[size]': 1})
        result['flows'].append({
            'id':     fid,
            'name':   fname,
            'status': fstat,
        })
    print(f'  [OK] {len(result["flows"])} flows cached')

# ── Campaigns ─────────────────────────────────────────────────────────────────
print('[INFO] Fetching campaigns...')
campaigns_resp = get('/campaigns', {
    'filter': 'equals(messages.channel,\'email\')',
    'page[size]': 50,
    'sort': '-updated_at'
})
if campaigns_resp:
    campaigns = campaigns_resp.get('data', [])
    print(f'  {len(campaigns)} campaigns found')

    for camp in campaigns[:20]:
        cid   = camp['id']
        cname = camp['attributes'].get('name', 'Unknown')
        cstat = camp['attributes'].get('status', '')
        sent_at = camp['attributes'].get('send_time', '')

        result['campaigns'].append({
            'id':      cid,
            'name':    cname,
            'status':  cstat,
            'sent_at': sent_at,
        })
    print(f'  [OK] {len(result["campaigns"])} campaigns cached')

# ── Metrics — aggregate stats ─────────────────────────────────────────────────
print('[INFO] Fetching aggregate email metrics...')

# Date range: last 30 days
now = datetime.now(timezone.utc)
start = (now - timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%SZ')
end   = now.strftime('%Y-%m-%dT%H:%M:%SZ')

# Get metric IDs for opened email, clicked email, revenue
metrics_list = get('/metrics', {'page[size]': 100})
metric_map = {}
if metrics_list:
    for m in metrics_list.get('data', []):
        name = m['attributes'].get('name', '').lower()
        metric_map[name] = m['id']

opened_id  = metric_map.get('opened email')
clicked_id = metric_map.get('clicked email')
revenue_id = metric_map.get('placed order') or metric_map.get('ordered product')

def get_metric_total(metric_id, measurement='count'):
    if not metric_id:
        return 0
    body = json.dumps({
        'data': {
            'type': 'metric-aggregate',
            'attributes': {
                'metric_id': metric_id,
                'measurements': [measurement],
                'interval':     'month',
                'page_size':    1,
                'filter':       [f'greater-or-equal(datetime,{start})', f'less-than(datetime,{end})'],
                'timezone':     'UTC',
            }
        }
    }).encode('utf-8')
    req = urllib.request.Request(BASE + '/metric-aggregates', data=body, headers={**HEADERS, 'Content-Type': 'application/json'})
    req.get_method = lambda: 'POST'
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read().decode('utf-8'))
            values = d.get('data', {}).get('attributes', {}).get('values', [[]])
            return sum(float(v) for row in values for v in row if v is not None)
    except Exception as e:
        print(f'  [WARN] metric {metric_id}: {e}')
        return 0

total_opens   = get_metric_total(opened_id, 'count')
total_clicks  = get_metric_total(clicked_id, 'count')
total_revenue = get_metric_total(revenue_id, 'sum_value')

result['metrics_30d'] = {
    'opens':   int(total_opens),
    'clicks':  int(total_clicks),
    'revenue': fmt_gbp(total_revenue),
    'period':  f'{start[:10]} to {end[:10]}',
}
print(f'  [OK] 30d: opens={int(total_opens)} clicks={int(total_clicks)} revenue=£{fmt_gbp(total_revenue)}')

ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
result['_built'] = ts

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(f"""// EDEN & CO. CEO Flight Deck — Klaviyo Cache
// Generated: {ts}
// Source: Klaviyo REST API v2024-10-15
window.EDEN = window.EDEN || {{}};
window.EDEN._klaviyoData = {json.dumps(result, indent=2)};
""")
print(f'[OK] Written {OUT_PATH}')
