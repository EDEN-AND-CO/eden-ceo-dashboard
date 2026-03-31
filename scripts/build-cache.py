#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck - Orders Cache Builder
Primary: Sales Log tab from Stock Tracker Google Sheet (Coupler daily refresh at 9am)
Fallback: local CSV if sheet unavailable.
Run: python3 scripts/build-cache.py
"""
import csv, json, os, sys, io, urllib.request
from datetime import datetime, timezone

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR    = os.path.dirname(SCRIPT_DIR)
OUT_PATH     = os.path.join(BUILD_DIR, 'src', 'data', 'orders-cache.js')
SHEET_ID     = '1Zx4fyaKGOuOcfpWmTyn2LZHBzWSUC-8sbOVqCFoh9fE'
SHEET_URL    = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sales%20Log'
CSV_FALLBACK = os.path.normpath(os.path.join(BUILD_DIR, '..', 'SKU FIles', 'Stock Tracker - Sales Log.csv'))

def fetch_sheet(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=30).read().decode('utf-8')

def parse_orders(data_str, label):
    orders, skipped = [], 0
    for row in csv.DictReader(io.StringIO(data_str)):
        n = {k.strip().replace(' ','_').upper(): v.strip() for k,v in row.items() if k.strip()}
        if n.get('ORDER_STATUS','').lower() in ('cancelled','canceled'):
            skipped += 1; continue
        orders.append(n)
    print(f'[OK] {len(orders)} orders from {label} ({skipped} cancelled skipped)')
    return orders

orders, source = [], ''
try:
    print('[INFO] Fetching Sales Log from Google Sheet...')
    orders = parse_orders(fetch_sheet(SHEET_URL), 'Google Sheet (Coupler)')
    source = 'Google Sheet — Coupler daily sync'
except Exception as e:
    print(f'[WARN] Sheet failed: {e} — using local CSV')
    with open(CSV_FALLBACK, newline='', encoding='utf-8-sig') as f:
        orders = parse_orders(f.read(), 'local CSV')
    source = 'Local CSV fallback'

ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(f"""// EDEN & CO. CEO Flight Deck - Orders Cache
// Generated: {ts} | Source: {source} | {len(orders)} rows
window.EDEN = window.EDEN || {{}};
window.EDEN._ordersCache = {json.dumps(orders, separators=(',',':'))};
window.EDEN._ordersCacheDate = '{ts}';
""")
print(f'[OK] Written {OUT_PATH} ({os.path.getsize(OUT_PATH)//1024} KB)')
