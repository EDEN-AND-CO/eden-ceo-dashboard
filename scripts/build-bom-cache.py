#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck — BoM Cache Builder
Reads PRODUCT COSTS sheet from BoM.xlsx, outputs bom-cache.js
"""
import openpyxl, json, os, sys
from datetime import datetime, timezone

SRC  = os.path.join(os.path.dirname(__file__), '../Final Data Files/SKUs & BOM/BoM.xlsx')
DEST = os.path.join(os.path.dirname(__file__), '../src/data/bom-cache.js')

HAMPER_KEYS   = ['LETTERBOX','COCOA','SIGNATURE','PAMPER','GRAND','PRESTIGE','ADDON']
HAMPER_LABELS = {
    'LETTERBOX': 'Letterbox Gift',
    'COCOA':     'Chocolate Hamper',
    'SIGNATURE': 'Signature Hamper',
    'PAMPER':    'Pamper Hamper',
    'GRAND':     'Grand Hamper',
    'PRESTIGE':  'Prestige Hamper',
    'ADDON':     'Add-On Item'
}
HAMPER_RRP = {'LETTERBOX':30,'COCOA':50,'SIGNATURE':65,'PAMPER':85,'GRAND':125,'PRESTIGE':175,'ADDON':0}

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb['PRODUCT COSTS']

products = []
current_section = 'Products'

for row in ws.iter_rows(min_row=3, values_only=True):
    name = row[0]
    if not name:
        continue
    name = str(name).strip()
    if not name:
        continue
    # Section header = has name but no cost
    if not row[5]:
        current_section = name
        continue
    try:
        cost = round(float(row[5]), 2)
    except (TypeError, ValueError):
        continue

    included = {}
    for i, h in enumerate(HAMPER_KEYS):
        val = row[8 + i]
        included[h] = bool(val) if val is not None else False

    products.append({
        'name':         name,
        'section':      current_section,
        'supplier':     str(row[1]).strip() if row[1] else '',
        'caseQty':      int(row[2]) if row[2] else None,
        'weightG':      float(row[3]) if row[3] else None,
        'privateLabel': bool(row[4]),
        'cost':         cost,
        'rrp':          round(float(row[6]), 2) if row[6] else None,
        'vatable':      bool(row[7]),
        'hampers':      included
    })

# COGS per hamper (sum of component costs)
hamper_cogs = {h: 0.0 for h in HAMPER_KEYS}
for p in products:
    for h in HAMPER_KEYS:
        if p['hampers'].get(h):
            hamper_cogs[h] = round(hamper_cogs[h] + p['cost'], 2)

# Gross margin per hamper
hamper_margin = {}
for h in HAMPER_KEYS:
    rrp = HAMPER_RRP.get(h, 0)
    cogs = hamper_cogs[h]
    hamper_margin[h] = round(((rrp / 1.2) - cogs) / (rrp / 1.2) * 100, 1) if rrp > 0 else 0

out = {
    'generated':    datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'hampers':      HAMPER_KEYS,
    'hamperLabels': HAMPER_LABELS,
    'hamperRrp':    HAMPER_RRP,
    'hamperCogs':   hamper_cogs,
    'hamperMargin': hamper_margin,
    'products':     products
}

with open(DEST, 'w', encoding='utf-8') as f:
    f.write('// EDEN & CO. CEO Flight Deck — BoM Cache\n')
    f.write('// Generated: ' + out['generated'] + '\n')
    f.write('// Do not edit manually. Run: python3 scripts/build-bom-cache.py\n\n')
    f.write('window.EDEN = window.EDEN || {};\n')
    f.write('window.EDEN.bomData = ')
    f.write(json.dumps(out, ensure_ascii=False, indent=2))
    f.write(';\n')

print('Wrote:', DEST)
print('Products:', len(products))
print('Hamper COGS:', hamper_cogs)
print('Hamper Margins:', hamper_margin)
