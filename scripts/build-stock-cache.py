#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck — Stock Cache Builder
Reads Stock tab from EDEN_CO_Weekly_Status.xlsx
Outputs src/data/stock-cache.js -> window.EDEN._stockData
Run: python3 scripts/build-stock-cache.py
"""
import openpyxl, json, os, sys, tempfile
import urllib.request
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR  = os.path.dirname(SCRIPT_DIR)
LOCAL_SRC  = os.path.join(BUILD_DIR, 'Final Data Files', 'Team Pulse', 'EDEN_CO_Weekly_Status.xlsx')
DEST       = os.path.join(BUILD_DIR, 'src', 'data', 'stock-cache.js')

# Allow OneDrive share link override (for GitHub Actions)
ONEDRIVE_URL = os.environ.get('ONEDRIVE_XLSX_URL', '')
if ONEDRIVE_URL:
    # Convert OneDrive share link to direct download URL
    download_url = ONEDRIVE_URL.replace('redir?', 'download?').replace('embed?', 'download?')
    if 'download' not in download_url:
        import base64
        encoded = base64.b64encode(ONEDRIVE_URL.encode()).decode().rstrip('=').replace('+','-').replace('/','_')
        download_url = f'https://api.onedrive.com/v1.0/shares/u!{encoded}/root/content'
    print(f'[INFO] Downloading XLSX from OneDrive...')
    tmp = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
    urllib.request.urlretrieve(download_url, tmp.name)
    SRC = tmp.name
    print(f'[INFO] Downloaded to {tmp.name}')
else:
    SRC = LOCAL_SRC
    if not os.path.exists(SRC):
        print(f'[ERROR] File not found: {SRC}')
        print('        Set ONEDRIVE_XLSX_URL env var to fetch from OneDrive')
        sys.exit(1)

# Map sheet item names to dashboard hamper keys
ITEM_MAP = {
    'Signatures':         'SIGNATURE',
    'Signature':          'SIGNATURE',
    'Chocolate Hampers':  'COCOA',
    'Chocolate Hamper':   'COCOA',
    'Petite':             'LETTERBOX',
    'Letterbox':          'LETTERBOX',
    'Large':              'GRAND',
    'Grand':              'GRAND',
    'Prestige':           'PRESTIGE',
    'Pamper':             'PAMPER',
    'Pamper Hamper':      'PAMPER',
    'Cocoa':              'COCOA',
}

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb['Stock']

stock_data = {}
packaging_data = []

for row in ws.iter_rows(min_row=2, values_only=True):
    item, typ, available, date, minimum, notes = (list(row) + [None]*6)[:6]
    if not item or not typ:
        continue
    item = str(item).strip()
    typ  = str(typ).strip().upper()
    available = int(available) if available is not None else None
    minimum   = int(minimum)   if minimum   is not None else None

    if typ == 'PRODUCT':
        key = ITEM_MAP.get(item)
        if key:
            stock_data[key] = {
                'item':      item,
                'available': available,
                'minimum':   minimum,
                'date':      str(date) if date else '',
                'notes':     notes or ''
            }
    elif typ == 'PACKAGING':
        packaging_data.append({
            'item':      item,
            'available': available,
            'minimum':   minimum,
            'date':      str(date) if date else '',
            'notes':     notes or ''
        })

generated = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

out = f"""// EDEN & CO. CEO Flight Deck — Stock Cache
// Generated: {generated}
// Source: EDEN_CO_Weekly_Status.xlsx · Stock tab
// Do not edit manually. Run: python3 scripts/build-stock-cache.py

window.EDEN = window.EDEN || {{}};
window.EDEN._stockData = {json.dumps(stock_data, indent=2)};
window.EDEN._packagingStock = {json.dumps(packaging_data, indent=2)};
window.EDEN._stockCacheDate = '{generated}';
"""

os.makedirs(os.path.dirname(DEST), exist_ok=True)
with open(DEST, 'w', encoding='utf-8') as f:
    f.write(out)

print(f'[OK] Stock cache written: {len(stock_data)} product lines, {len(packaging_data)} packaging items')
print(f'     -> {DEST}')
for k, v in stock_data.items():
    print(f'     {k}: {v["available"]} units (min {v["minimum"]})')
