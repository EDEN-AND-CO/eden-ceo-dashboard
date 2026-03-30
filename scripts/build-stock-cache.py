#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck — Stock Cache Builder
Reads Stock tab from EDEN_CO_Weekly_Status.xlsx
Outputs src/data/stock-cache.js -> window.EDEN._stockData
Run: python3 scripts/build-stock-cache.py
"""
import openpyxl, json, os, sys
from datetime import datetime, timezone

SRC  = os.path.join(os.path.dirname(__file__), '../Final Data Files/Team Pulse/EDEN_CO_Weekly_Status.xlsx')
DEST = os.path.join(os.path.dirname(__file__), '../src/data/stock-cache.js')

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
