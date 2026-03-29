#!/usr/bin/env python3
"""
EDEN & CO. CEO Flight Deck - ShipStation Order Refresh
Fetches all shipped orders from ShipStation API and writes src/data/orders-cache.js

Usage: python3 scripts/refresh-from-shipstation.py
Run from the build/ directory.

Credentials: ShipStation Settings > Account > API Settings
"""

import json, os, sys, base64, time, csv, re
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError

API_KEY    = '88cae236adce40dda1c7cae7c4736cdc'
API_SECRET = 'ac5ecf4cffd8410cb423879a06dad7bf'
BASE_URL   = 'https://ssapi.shipstation.com'
START_DATE = '2025-01-01 00:00:00'  # Pull from Jan 2025 onwards

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR    = os.path.dirname(SCRIPT_DIR)
OUT_PATH     = os.path.join(BUILD_DIR, 'src', 'data', 'orders-cache.js')
VIRGIN_CSV   = os.path.join(BUILD_DIR, '..', 'SKU FIles', 'Stock Tracker - Sales Log.csv')

AUTH = base64.b64encode(f'{API_KEY}:{API_SECRET}'.encode()).decode()

def api_get(path):
    url = BASE_URL + path
    req = Request(url, headers={'Authorization': f'Basic {AUTH}', 'Accept': 'application/json'})
    with urlopen(req) as resp:
        return json.loads(resp.read().decode())

def fetch_all_orders():
    orders = []
    page = 1
    page_size = 500

    while True:
        print(f'  Fetching page {page}...', end=' ', flush=True)
        params = (
            f'?orderStatus=shipped'
            f'&createDateStart={START_DATE.replace(" ", "%20")}'
            f'&pageSize={page_size}'
            f'&page={page}'
            f'&sortBy=OrderDate'
            f'&sortDir=ASC'
        )
        for attempt in range(3):
            try:
                data = api_get(f'/orders{params}')
                break
            except Exception as e:
                if attempt == 2:
                    print(f'ERROR after 3 attempts: {e}')
                    sys.exit(1)
                print(f' retry {attempt+1}...', end=' ', flush=True)
                time.sleep(5)

        batch = data.get('orders', [])
        print(f'{len(batch)} orders (total so far: {len(orders) + len(batch)})')
        orders.extend(batch)

        total = data.get('total', 0)
        pages = data.get('pages', 1)
        if page >= pages:
            break

        page += 1
        time.sleep(1.5)  # ShipStation rate limit: 40 req/min

    return orders

def map_order(o):
    """Map ShipStation API order object to the same field names as the CSV export."""
    items = o.get('items', [])
    # Pick first non-adjustment item for SKU
    sku = ''
    for item in items:
        if not item.get('adjustment', False):
            sku = (item.get('fulfillmentSku') or item.get('sku') or '').strip()
            if sku:
                break

    bill = o.get('billTo', {}) or {}
    ship = o.get('shipTo', {}) or {}
    adv  = o.get('advancedOptions', {}) or {}

    return {
        'ORDER_ID':          str(o.get('orderId', '')),
        'ORDER_NUMBER':      str(o.get('orderNumber', '')),
        'ORDER_DATE':        (o.get('orderDate') or '')[:19].replace('T', 'T'),
        'SHIP_TO_COUNTRY':   ship.get('country', ''),
        'AMOUNT_PAID':       str(o.get('amountPaid', 0) or o.get('orderTotal', 0)),
        'SHIPPING_AMOUNT':   str(o.get('shippingAmount', 0)),
        'CARRIER_CODE':      o.get('carrierCode', '') or '',
        'STORE_ID':          str(adv.get('storeId', '')),
        'ITEM_QUANTITY':     str(sum(i.get('quantity', 1) for i in items if not i.get('adjustment'))),
        'ORDER_STATUS':      o.get('orderStatus', ''),
        'SKU':               sku,
        'SHIPPING_POSTCODE': ship.get('postalCode', '') or '',
        'SHIPPING_COUNTRY':  ship.get('country', '') or '',
        'BILLING_NAME':      bill.get('name', '') or '',
        'SHIP_TO_NAME':      ship.get('name', '') or '',
        'GIFT_MESSAGE':      o.get('giftMessage', '') or '',
        'DATE_MODIFIED':     (o.get('modifyDate') or '')[:19],
        'SERVICE_CODE':      o.get('serviceCode', '') or '',
        'BILLING_COUNTRY':   bill.get('country', '') or '',
    }

def load_virgin_from_csv():
    """
    Virgin Experience Days pays EDEN separately — ShipStation records amountPaid=0.
    Load Virgin orders (store 40322 + P-SKU) from the local CSV export which has correct amounts.
    Returns dict of ORDER_ID -> mapped row.
    """
    csv_path = os.path.normpath(VIRGIN_CSV)
    if not os.path.exists(csv_path):
        print(f'  WARNING: Virgin CSV not found at {csv_path}, skipping Virgin merge')
        return {}

    virgin = {}
    with open(csv_path, newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            status = row.get('ORDER STATUS', '').lower()
            if status == 'cancelled': continue
            store = row.get('STORE ID', '')
            sku   = row.get('SKU', '')
            try: amt = float(row.get('AMOUNT PAID') or 0)
            except: amt = 0
            if store != '40322' and not re.match(r'^[Pp]\d', sku):
                continue
            if amt <= 0: continue
            oid = row.get('ORDER ID', '')
            if not oid: continue
            virgin[oid] = {
                'ORDER_ID':          oid,
                'ORDER_NUMBER':      row.get('ORDER NUMBER', ''),
                'ORDER_DATE':        row.get('ORDER DATE', '')[:19],
                'SHIP_TO_COUNTRY':   row.get('SHIP TO COUNTRY', ''),
                'AMOUNT_PAID':       str(amt),
                'SHIPPING_AMOUNT':   row.get('SHIPPING AMOUNT', '0'),
                'CARRIER_CODE':      row.get('CARRIER CODE', ''),
                'STORE_ID':          store,
                'ITEM_QUANTITY':     row.get('ITEM QUANTITY', '1'),
                'ORDER_STATUS':      row.get('ORDER STATUS', ''),
                'SKU':               sku,
                'SHIPPING_POSTCODE': row.get('SHIPPING POSTCODE', ''),
                'SHIPPING_COUNTRY':  row.get('SHIPPING COUNTRY', ''),
                'BILLING_NAME':      row.get('BILLING NAME', ''),
                'SHIP_TO_NAME':      row.get('SHIP TO NAME', ''),
                'GIFT_MESSAGE':      row.get('GIFT MESSAGE', ''),
                'DATE_MODIFIED':     row.get('DATE MODIFIED', '')[:19],
                'SERVICE_CODE':      row.get('SERVICE CODE', ''),
                'BILLING_COUNTRY':   row.get('BILLING COUNTRY', ''),
            }
    print(f'  Loaded {len(virgin)} Virgin orders from CSV')
    return virgin


def main():
    print(f'EDEN & CO. ShipStation Order Refresh')
    print(f'Fetching shipped orders from {START_DATE}...')

    raw_orders = fetch_all_orders()
    print(f'\nTotal fetched: {len(raw_orders)} orders')

    mapped = [map_order(o) for o in raw_orders]

    # Merge Virgin orders from CSV (API records amountPaid=0 for Virgin — no payment data)
    print('Loading Virgin orders from CSV...')
    virgin_map = load_virgin_from_csv()
    api_ids = {o['ORDER_ID'] for o in mapped}
    # Remove any API Virgin orders (they have £0) and replace with CSV versions
    mapped = [o for o in mapped if o['ORDER_ID'] not in virgin_map]
    mapped.extend(virgin_map.values())
    print(f'  Final order count after Virgin merge: {len(mapped)}')

    ts = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    js = f"""// EDEN & CO. CEO Flight Deck - Orders Cache
// Auto-generated by scripts/refresh-from-shipstation.py at {ts}
// Source: ShipStation API + Virgin CSV ({len(mapped)} shipped orders from {START_DATE[:10]})
// Re-run refresh-from-shipstation.py to update.
window.EDEN = window.EDEN || {{}};
window.EDEN._ordersCache = {json.dumps(mapped, separators=(',', ':'))};
window.EDEN._ordersCacheDate = '{ts}';
"""

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        f.write(js)

    size_kb = os.path.getsize(OUT_PATH) // 1024
    print(f'Written {OUT_PATH} ({size_kb} KB)')
    print(f'Done. Reload the dashboard to see updated data.')

if __name__ == '__main__':
    main()
