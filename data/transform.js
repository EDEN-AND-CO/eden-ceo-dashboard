/**
 * EDEN & CO. CEO Flight Deck - SKU Resolution and Data Transform
 * Resolves raw SKUs to core product lines, detects add-ons, maps channels.
 */
window.EDEN = window.EDEN || {};

(function () {
  'use strict';

  var CONFIG = window.EDEN.CONFIG;

  // ── Occasion map: SKU fragment -> canonical occasion ──
  var OCCASION_MAP = {
    'BIRTHDAY': 'BIRTHDAY', 'HB': 'BIRTHDAY', 'BDAY': 'BIRTHDAY',
    'MUM': 'MUM',
    'LOVE': 'LOVE', 'WL': 'LOVE', 'GETWELL': 'LOVE',
    'JFY': 'JFY',
    'THANKU': 'THANKU', 'TY': 'THANKU', 'THANKYOU': 'THANKU',
    'BABY': 'BABY', 'BA': 'BABY',
    'DAD': 'DAD',
    'XMAS': 'XMAS', 'CHRISTMAS': 'XMAS',
    'CELEBRATE': 'CELEBRATE', 'CONGRATS': 'CELEBRATE',
    'EDEN': 'EDEN', 'EDENCO': 'EDEN'
  };

  // ── Add-on suffix map ──
  var ADDON_MAP = {
    '-PRO': 'PROSECCO', '-P': 'PROSECCO',
    '-M': 'MOCKTAIL',
    '-M-2': 'MOCKTAIL_X2',
    '-PRO-2': 'PROSECCO_X2', '-P-2': 'PROSECCO_X2',
    '-SCV': 'GIN_LIQUEUR', '-EG': 'GIN_LIQUEUR', '-WBG': 'GIN_LIQUEUR',
    '-RA': 'GIN_LIQUEUR', '-GW': 'GIN_LIQUEUR', '-CG': 'GIN_LIQUEUR',
    '-RGG': 'GIN_LIQUEUR'
  };

  // Sorted by longest suffix first to avoid partial matches
  var ADDON_SUFFIXES = Object.keys(ADDON_MAP).sort(function (a, b) {
    return b.length - a.length;
  });

  /**
   * Detect and strip add-on suffix from a SKU.
   * @param {string} sku - Upper-cased SKU
   * @returns {{ addon: string, stripped: string }}
   */
  function detectAddon(sku) {
    for (var i = 0; i < ADDON_SUFFIXES.length; i++) {
      var suffix = ADDON_SUFFIXES[i];
      if (sku.endsWith(suffix)) {
        return {
          addon: ADDON_MAP[suffix],
          stripped: sku.slice(0, -suffix.length)
        };
      }
    }
    return { addon: 'NONE', stripped: sku };
  }

  /**
   * Strip platform/diet suffixes and re-resolve.
   * Strips -VIRGIN, -N, -Y, -VE, -GF, -DF from end.
   * @param {string} sku
   * @returns {string} Cleaned SKU
   */
  function stripPlatformSuffixes(sku) {
    var patterns = ['-VIRGIN', '-N', '-Y', '-VE', '-GF', '-DF'];
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < patterns.length; i++) {
        if (sku.endsWith(patterns[i])) {
          sku = sku.slice(0, -patterns[i].length);
          changed = true;
        }
      }
    }
    return sku;
  }

  /**
   * Extract occasion from SKU parts.
   * @param {string} sku - Upper-cased SKU (after addon strip)
   * @returns {string} Canonical occasion or 'BASE'
   */
  function extractOccasion(sku) {
    var parts = sku.split('-');
    for (var i = 0; i < parts.length; i++) {
      if (OCCASION_MAP[parts[i]]) {
        return OCCASION_MAP[parts[i]];
      }
    }
    return 'BASE';
  }

  /**
   * Resolve a raw SKU to a core product key.
   * Priority: direct keyword match, then pattern-based resolution.
   * @param {string} rawSku
   * @returns {string} PETITE | COCOA | SIGNATURE | PAMPER | GRAND | PRESTIGE | UNKNOWN
   */
  // Virgin Experience Days SKU lookup (P-codes)
  var VIRGIN_SKU_MAP = {
    'P06059': 'PETITE',  // Luxury Chocolate Letterbox Gift
    'P07273': 'PETITE',  // Happy Birthday Premium Chocolate Letterbox Gift
    'P10527': 'PETITE',  // Christmas Chocolate Letterbox Gift
    'P10528': 'PETITE',  // Christmas Chocolate Letterbox Gift with Prosecco
    'P10525': 'COCOA',   // Christmas Chocolate Hamper with Prosecco
    'P04316': 'GRAND',   // Grand Food and Drink Hamper
    'P04317': 'GRAND',   // Grand Food Hamper with Gin
    'P04314': 'SIGNATURE', // Luxury Food and Drink Hamper
    'P04315': 'SIGNATURE', // Luxury Food and Drink Hamper with Gin
    'P04652': 'SIGNATURE', // Happy Birthday Food and Drink Hamper with Prosecco
    'P04653': 'SIGNATURE', // Double Mocktail Personalised Food & Drink Hamper
    'P10521': 'SIGNATURE', // Christmas Luxury Food Hamper
    'P10523': 'SIGNATURE', // Christmas Luxury Food Hamper with Mocktails
    'P04313': 'SIGNATURE', // Exclusive Gin, Vodka or Whisky in Presentation Box
    'P04649': 'SIGNATURE', // Exclusive Hot Chocolate & Truffles, Prosecco Lovers Hampers
    'P07274': 'SIGNATURE', // Luxury Hot Chocolate and Brownie Lovers Hamper
    'P06058': 'SIGNATURE', // Exclusive Whisky and Chocolate Lovers Hamper
    'P10530': 'SIGNATURE', // Just For You Chocolate Hot Hamper with Salted Caramel Vodka
    'P10519': 'SIGNATURE'  // Christmas Gin 350ml with 24 Carat Gold Sparkle
  };

  function resolveProduct(rawSku) {
    if (!rawSku) return 'UNKNOWN';
    var sku = rawSku.toUpperCase().trim();

    // Virgin P-code lookup
    if (VIRGIN_SKU_MAP[sku]) return VIRGIN_SKU_MAP[sku];

    // Strip platform suffixes first
    sku = stripPlatformSuffixes(sku);

    // Strip addon for product resolution
    var addonResult = detectAddon(sku);
    sku = addonResult.stripped;

    // Direct keyword checks (order matters: check most specific first)

    // PRESTIGE
    if (sku.indexOf('PRESTIGE') !== -1 || sku.indexOf('WICKER') !== -1) return 'PRESTIGE';
    if (sku.match(/^PRESTIGE/)) return 'PRESTIGE';

    // GRAND
    if (sku.indexOf('-LG-') !== -1 || sku.indexOf('-LRG') !== -1) return 'GRAND';
    if (sku.match(/344-VG-LG-/)) return 'GRAND';

    // PAMPER
    if (sku.indexOf('PAMPER') !== -1) return 'PAMPER';

    // PETITE / Letterbox - check before COCOA since CHOC-TUBE is petite
    if (sku.match(/344-VG-CHOC-TUBE/)) return 'PETITE';
    if (sku.indexOf('PETITE') !== -1) return 'PETITE';
    if (sku.indexOf('LETTERBOX') !== -1) return 'PETITE';

    // COCOA / Chocolate Hamper
    if (sku.match(/344-VG-CHOC-HAMPER/) || sku.match(/344-VG-CHOC-.*-HAMPER/)) return 'COCOA';
    if (sku.indexOf('COCOA') !== -1 || sku.indexOf('COCAO') !== -1) return 'COCOA';

    // SIGNATURE
    if (sku.match(/344-VG-GREY/)) return 'SIGNATURE';
    if (sku.match(/344-VG-HAMPER/) || sku.match(/344-VG-[A-Z]+-HAMPER/)) return 'SIGNATURE';
    if (sku.indexOf('SIGNATURE') !== -1) return 'SIGNATURE';

    return 'UNKNOWN';
  }

  /**
   * Detect corporate channel override from billing name.
   * @param {string} billingName
   * @returns {{ channel: string, commission: number } | null}
   */
  function detectCorporateChannel(billingName) {
    if (!billingName) return null;
    var lower = billingName.toLowerCase();
    var corps = CONFIG.corporateChannels;
    for (var key in corps) {
      if (corps.hasOwnProperty(key) && lower.indexOf(key) !== -1) {
        return { channel: corps[key].name, commission: corps[key].commission };
      }
    }
    return null;
  }

  /**
   * Resolve channel from store_id, with corporate billing name override.
   * @param {string} storeId
   * @param {string} billingName
   * @returns {{ channel: string, commission: number }}
   */
  function resolveChannel(storeId, billingName) {
    // Corporate override takes priority
    var corp = detectCorporateChannel(billingName);
    if (corp) return corp;

    var ch = CONFIG.channels[storeId];
    if (ch) return { channel: ch.name, commission: ch.commission };

    return { channel: 'Unknown', commission: 0 };
  }

  /**
   * Enrich a single raw order row into a full order object.
   * @param {Object} row - Raw row from Sales Log CSV
   * @returns {Object} Enriched order
   */
  function enrichOrder(row) {
    var rawSku = (row.SKU || '').trim();
    var skuUpper = rawSku.toUpperCase();
    var cleanSku = stripPlatformSuffixes(skuUpper);
    var addonResult = detectAddon(cleanSku);
    var coreProduct = resolveProduct(rawSku);
    var productInfo = CONFIG.products[coreProduct] || { name: 'Unknown', rrp: 0, cogs: 0 };
    var channelInfo = resolveChannel(row.STORE_ID || '', row.BILLING_NAME || '');
    // SKU-based channel overrides
    if (/^P\d/.test(skuUpper)) {
      channelInfo = { channel: 'Virgin', commission: 0.30 };
    } else if (skuUpper.indexOf('-EXT') !== -1 || skuUpper.indexOf('RDESK') !== -1 ||
               skuUpper.indexOf('REACHDESK') !== -1 || skuUpper.indexOf('SENDOSO') !== -1) {
      channelInfo = { channel: 'Corporate', commission: channelInfo.commission };
    }
    var amountPaid = parseFloat(row.AMOUNT_PAID) || 0;
    var amountExVat = amountPaid / 1.2;
    var commissionPct = channelInfo.commission;
    var cogs = productInfo.cogs;
    var addonCogs = (CONFIG.addonCogs && CONFIG.addonCogs[addonResult.addon]) || 0;
    var totalCogs = cogs + addonCogs;
    // Margin on ex-VAT revenue; commission charged on gross (inc VAT) by most platforms
    var grossMargin = amountExVat > 0 ? (amountExVat - totalCogs - (amountPaid * commissionPct)) / amountExVat : 0;

    return {
      // Original fields
      order_id: row.ORDER_ID || '',
      order_number: row.ORDER_NUMBER || '',
      order_date: row.ORDER_DATE || '',
      country: row.SHIP_TO_COUNTRY || '',
      amount_paid: amountPaid,
      shipping_amount: parseFloat(row.SHIPPING_AMOUNT) || 0,
      carrier_code: row.CARRIER_CODE || '',
      store_id: row.STORE_ID || '',
      quantity: parseInt(row.ITEM_QUANTITY) || 1,
      status: row.ORDER_STATUS || '',
      raw_sku: rawSku,
      shipping_postcode: row.SHIPPING_POSTCODE || '',
      shipping_country: row.SHIPPING_COUNTRY || '',
      billing_name: row.BILLING_NAME || '',
      ship_to_name: row.SHIP_TO_NAME || '',
      gift_message: row.GIFT_MESSAGE || '',
      date_modified: row.DATE_MODIFIED || '',

      // Enriched fields
      core_product: coreProduct,
      product_line: productInfo.name,
      channel: channelInfo.channel,
      commission_pct: commissionPct,
      add_on: addonResult.addon,
      occasion: extractOccasion(addonResult.stripped),
      base_sku: addonResult.stripped,
      cogs: totalCogs,
      amount_ex_vat: Math.round(amountExVat * 100) / 100,
      rrp: productInfo.rrp,
      gross_margin_pct: Math.round(grossMargin * 10000) / 100
    };
  }

  /**
   * Transform all raw sheet data into enriched dashboard data.
   * @param {Object} rawSheets - Output from fetchAllSheets
   * @returns {Object} { orders, stock, componentStock, skuMap }
   */
  function transformData(rawSheets) {
    var orders = (rawSheets.salesLog || []).map(enrichOrder).filter(function (o) {
      var s = o.status.toLowerCase();
      return o.amount_paid > 0 && s !== 'cancelled' && s !== 'canceled';
    });

    return {
      orders: orders,
      stock: rawSheets.stock || [],
      componentStock: rawSheets.componentStock || [],
      skuMap: rawSheets.skuMap || []
    };
  }

  // Expose on namespace
  window.EDEN.transform = {
    transformData: transformData,
    enrichOrder: enrichOrder,
    resolveProduct: resolveProduct,
    resolveChannel: resolveChannel,
    detectAddon: detectAddon,
    extractOccasion: extractOccasion
  };

})();
