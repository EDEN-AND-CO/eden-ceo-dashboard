#!/usr/bin/env python3
"""
EDEN & CO. Critical Path 2026 Cache Builder
Reads from Google Sheet tab (gid=1368330420) and writes src/data/critical-path-cache.js
Run: python3 scripts/build-critpath-cache.py
"""
import csv, io, json, os, sys, urllib.request
from datetime import datetime, timezone

SHEET_ID  = '1XXivn1DwnkVmlfCP8YGA4va6SywS8Ax51QldlIvyq70'
GID       = '1060730891'
SHEET_URL = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={GID}'
OUT_FILE  = os.path.join(os.path.dirname(__file__), '../src/data/critical-path-cache.js')

VALID_STATUSES = {'done', 'on-track', 'not-started', 'blocked', 'overdue'}

print('EDEN & CO. Critical Path Cache Builder')
print('=' * 40)

try:
    req = urllib.request.Request(SHEET_URL, headers={'User-Agent': 'Mozilla/5.0'})
    raw = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')
    rows = list(csv.reader(io.StringIO(raw)))
    print(f'  Fetched {len(rows)} rows from sheet')
except Exception as e:
    print(f'[ERROR] Could not fetch sheet: {e}')
    sys.exit(1)

# Expect header row: #, Title, Owner, Deadline, Status, Phase, Notes
if not rows:
    print('[ERROR] Sheet is empty'); sys.exit(1)

header = [h.strip().lower() for h in rows[0]]
expected = ['#', 'title', 'owner', 'deadline', 'status', 'phase', 'notes']
if header[:7] != expected:
    print(f'[WARN] Unexpected header: {header[:7]} — expected {expected}')

items = []
errors = []
for i, row in enumerate(rows[1:], start=2):
    if len(row) < 5 or not row[0].strip():
        continue
    status = row[4].strip().lower() if len(row) > 4 else 'not-started'
    if status not in VALID_STATUSES:
        errors.append(f'  Row {i}: unknown status "{status}" for "{row[1].strip()[:40]}" — defaulting to not-started')
        status = 'not-started'
    items.append({
        'id':       row[0].strip(),
        'title':    row[1].strip(),
        'owner':    row[2].strip() if len(row) > 2 else '',
        'deadline': row[3].strip() if len(row) > 3 else '',
        'status':   status,
        'phase':    row[5].strip() if len(row) > 5 else '',
        'notes':    row[6].strip() if len(row) > 6 else '',
    })

if errors:
    print(f'[WARN] {len(errors)} status errors:')
    for e in errors: print(e)

counts = {}
for item in items:
    counts[item['status']] = counts.get(item['status'], 0) + 1

print(f'  {len(items)} items loaded')
print(f'  Status breakdown: {counts}')

result = {
    'generated':  datetime.now(timezone.utc).strftime('%Y-%m-%d'),
    'sheet_url':  f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?gid={GID}',
    'total':      len(items),
    'items':      items,
}

js = (
    '// EDEN & CO. Critical Path 2026\n'
    f'// Built: {result["generated"]} — source: Google Sheet gid={GID}\n'
    '// Status overrides stored in localStorage[\'cp_overrides\']\n\n'
    'window.EDEN = window.EDEN || {};\n'
    f'window.EDEN._criticalPath = {json.dumps(result, indent=2)};\n'
)

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, 'w') as f:
    f.write(js)

print(f'\nWritten: {OUT_FILE}')
if errors:
    print(f'[ACTION NEEDED] Fix {len(errors)} invalid status values in the sheet')
else:
    print('[OK] No errors')
