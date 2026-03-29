/**
 * EDEN & CO. CEO Flight Deck - Configuration
 * Targets, thresholds, product reference data, and channel mappings.
 */
window.EDEN = window.EDEN || {};

window.EDEN.CONFIG = {
  targets: {
    daily_orders: 50,
    monthly_revenue: 50000,
    annual_revenue: 1000000,
    blended_roas: 4.0,
    google_roas: 3.0,
    amazon_roas: 5.0,
    meta_roas: 5.0,
    tacos_pct: 15,
    contribution_margin_pct: 45,
    aov: 50,
    google_cpa: 15.90,
    amazon_acos: 25
  },

  rag: {
    daily_orders:           { green: 50, amber: 35, red: 20 },
    monthly_revenue:        { green: 50000, amber: 35000, red: 20000 },
    blended_roas:           { green: 4.0, amber: 3.0, red: 2.0 },
    google_roas:            { green: 3.0, amber: 2.5, red: 2.0 },
    amazon_roas:            { green: 5.0, amber: 3.5, red: 2.0 },
    meta_roas:              { green: 5.0, amber: 3.5, red: 2.0 },
    tacos_pct:              { green: 15, amber: 20, red: 25, inverted: true },
    contribution_margin_pct: { green: 45, amber: 40, red: 35 },
    aov:                    { green: 50, amber: 42, red: 35 },
    google_cpa:             { green: 15.90, amber: 18, red: 22, inverted: true },
    amazon_acos:            { green: 25, amber: 30, red: 40, inverted: true },
    stock_days:             { green: 30, amber: 15, red: 7 }
  },

  products: {
    PETITE:    { name: 'Petite (Letterbox Gift)', rrp: 30.00, cogs: 12.50, corporate_name: 'The Gesture' },
    COCOA:     { name: 'Cocoa (Chocolate Hamper)', rrp: 50.00, cogs: 17.95, corporate_name: 'The Indulgence' },
    SIGNATURE: { name: 'Signature Hamper',         rrp: 65.00, cogs: 23.21, corporate_name: 'The Signature' },
    PAMPER:    { name: 'Pamper Hamper',             rrp: 85.00, cogs: 33.00, corporate_name: null },
    GRAND:     { name: 'Grand Hamper',              rrp: 125.00, cogs: 50.00, corporate_name: 'The Celebration' },
    PRESTIGE:  { name: 'Prestige (Wicker)',         rrp: 175.00, cogs: 65.00, corporate_name: 'The Prestige' }
  },

  channels: {
    '87653':  { name: 'Shopify',           commission: 0.025 },
    '67911':  { name: 'Amazon UK',         commission: 0.15 },
    '167644': { name: 'Amazon IRE',        commission: 0.15 },
    '47576':  { name: 'Yumbles',           commission: 0.25 },
    '16432':  { name: 'NOTHS',             commission: 0.25 },
    '40322':  { name: 'Virgin',            commission: 0.30 },
    '40324':  { name: 'Etsy',              commission: 0.13 },
    '163100': { name: 'Bespoke/Corporate', commission: 0 }
  },

  corporateChannels: {
    'reachdesk':  { name: 'ReachDesk',  commission: 0.27 },
    'sendoso':    { name: 'Sendoso',    commission: 0.10 },
    'needi':      { name: 'Needi',      commission: 0.20 },
    'giftsenda':  { name: 'GiftSenda',  commission: 0.15 },
    '-ext':       { name: 'GiftSenda',  commission: 0.15 }
  },

  addonCogs: {
    PROSECCO:     3.04,
    PROSECCO_X2:  6.08,
    MOCKTAIL:     1.20,
    MOCKTAIL_X2:  2.40,
    GIN_LIQUEUR:  7.50,
    NONE:         0
  },

  maxCPA: {
    PETITE: 3.25, COCOA: 6.25, SIGNATURE: 10.91,
    PAMPER: 11.62, GRAND: 19.00, PRESTIGE: 27.88
  },

  localCSVPaths: {
    salesLog:       '../../SKU FIles/Stock Tracker - Sales Log.csv',
    stock:          '../../SKU FIles/Stock Tracker - Component Stock.csv',
    componentStock: '../../SKU FIles/Stock Tracker - Component Stock.csv',
    skuMap:         '../../SKU FIles/Stock Tracker - SKU MAP.csv'
  }
};
