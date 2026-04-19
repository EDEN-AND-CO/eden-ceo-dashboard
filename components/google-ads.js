/**
 * EDEN & CO. CEO Flight Deck - Google Ads Component
 * Campaign + search term data — refreshed via Google Ads MCP.
 * Last MCP refresh: 2026-03-31T16:00:00Z (30-day window)
 * To refresh: run Google Ads MCP queries in Claude and update CAMPAIGNS + SEARCH_TERMS below.
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

// Timestamp used by Flight Check panel
window.EDEN._gadsFetched = '2026-03-31T16:00:00Z';

(function () {
  'use strict';

  // ── Live data — Google Ads MCP, 31 Mar 2026, LAST_30_DAYS ───────────────
  // To update: ask Claude to run Google Ads MCP campaign + search term queries

  var CAMPAIGNS = [
    { name: 'Search - Generic',            spend: 1692.63, clicks: 1756, conv: 87.14,  conv_value: 4253.02, avg_cpc: 0.96 },
    { name: 'PMAX',                         spend: 1328.51, clicks: 1558, conv: 91.99,  conv_value: 4542.16, avg_cpc: 0.85 },
    { name: 'Shopping - Brand',             spend: 182.06,  clicks: 258,  conv: 14.92,  conv_value: 898.99,  avg_cpc: 0.71 },
    { name: 'Search - Brand',               spend: 74.15,   clicks: 226,  conv: 15.03,  conv_value: 879.90,  avg_cpc: 0.33 },
    { name: 'Shopping - Generic (Catch All)', spend: 1.30,  clicks: 35,   conv: 2.00,   conv_value: 44.40,   avg_cpc: 0.04 }
  ];

  var SEARCH_TERMS = [
    { term: 'gluten free hampers',              clicks: 73,  conv: 10.06, cost: 81.95,  cpc: 1.12 },
    { term: 'eden and co',                      clicks: 102, conv: 7.03,  cost: 32.73,  cpc: 0.32 },
    { term: 'vegan hamper',                     clicks: 97,  conv: 4.75,  cost: 107.78, cpc: 1.11 },
    { term: 'gluten free hamper',               clicks: 121, conv: 4.56,  cost: 124.28, cpc: 1.03 },
    { term: 'eden and co hampers',              clicks: 28,  conv: 3.00,  cost: 10.35,  cpc: 0.37 },
    { term: 'eden treats',                      clicks: 9,   conv: 3.00,  cost: 2.78,   cpc: 0.31 },
    { term: 'eden & co',                        clicks: 49,  conv: 2.00,  cost: 16.07,  cpc: 0.33 },
    { term: 'vegetarian gift hamper',           clicks: 3,   conv: 2.00,  cost: 3.86,   cpc: 1.29 },
    { term: 'vegan hamper uk',                  clicks: 34,  conv: 2.00,  cost: 40.56,  cpc: 1.19 },
    { term: 'vegan hampers',                    clicks: 29,  conv: 2.00,  cost: 42.88,  cpc: 1.48 },
    { term: 'gluten free dairy free hamper',    clicks: 4,   conv: 1.06,  cost: 5.23,   cpc: 1.31 },
    { term: 'dairy and gluten free',            clicks: 1,   conv: 1.00,  cost: 1.31,   cpc: 1.31 },
    { term: 'gluten and dairy free hamper',     clicks: 5,   conv: 1.00,  cost: 2.23,   cpc: 0.45 },
    { term: 'gluten and dairy free hampers',    clicks: 7,   conv: 1.00,  cost: 9.74,   cpc: 1.39 },
    { term: 'gluten free gift hampers',         clicks: 1,   conv: 1.00,  cost: 0.93,   cpc: 0.93 },
    { term: 'gluten free gifts',                clicks: 11,  conv: 1.00,  cost: 9.64,   cpc: 0.88 },
    { term: 'gluten free goodies',              clicks: 1,   conv: 1.00,  cost: 0.73,   cpc: 0.73 },
    { term: 'gluten free luxury hamper',        clicks: 5,   conv: 1.00,  cost: 5.46,   cpc: 1.09 },
    { term: 'vegan gluten free gift baskets',   clicks: 1,   conv: 1.00,  cost: 0.51,   cpc: 0.51 },
    { term: 'vegetarian hampers',               clicks: 9,   conv: 1.00,  cost: 17.09,  cpc: 1.90 }
  ];

  // Computed totals
  var totalSpend  = CAMPAIGNS.reduce(function (s, c) { return s + c.spend; }, 0);
  var totalConv   = CAMPAIGNS.reduce(function (s, c) { return s + c.conv; }, 0);
  var totalValue  = CAMPAIGNS.reduce(function (s, c) { return s + c.conv_value; }, 0);
  var totalClicks = CAMPAIGNS.reduce(function (s, c) { return s + c.clicks; }, 0);
  var blendedCPA  = totalConv > 0 ? totalSpend / totalConv : 0;
  var blendedROAS = totalSpend > 0 ? totalValue / totalSpend : 0;
  var blendedCPC  = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // ── RAG helper ───────────────────────────────────────────────────────────

  function ragCls(val, green, amber, inverted) {
    if (inverted) {
      return val <= green ? 'tg' : val <= amber ? 'ta' : 'tr';
    }
    return val >= green ? 'tg' : val >= amber ? 'ta' : 'tr';
  }

  function fmt2(n) { return Math.round(n * 100) / 100; }
  function fmtGBP(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
  function fmtGBPd(n) { return '£' + fmt2(n).toFixed(2); }

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    var roasCol = blendedROAS >= 3.0 ? 'var(--OK)' : blendedROAS >= 2.5 ? 'var(--AMB)' : 'var(--RED)';
    var cpaCol  = blendedCPA <= 15.90 ? 'var(--OK)' : blendedCPA <= 18 ? 'var(--AMB)' : 'var(--RED)';

    var adblk = document.getElementById('gads-adblk');
    if (adblk) {
      adblk.className = 'adblk ' + (blendedROAS >= 3.0 ? 'ok' : 'wn');
      adblk.innerHTML =
        '<div class="adhead"><div class="adname">Google Ads</div>' +
          '<span class="rag ' + (blendedROAS >= 3.0 ? 'g' : 'a') + '">' +
            (blendedROAS >= 3.0 ? 'ABOVE TARGET' : 'BELOW TARGET') +
          '</span>' +
        '</div>' +
        '<div class="adgrid">' +
          '<div><div class="amlbl">ROAS 30d</div><div class="amval" style="color:' + roasCol + '">' + fmt2(blendedROAS) + 'x</div><div class="amtgt">Target 3x+</div></div>' +
          '<div><div class="amlbl">Spend 30d</div><div class="amval">' + fmtGBP(totalSpend) + '</div><div class="amtgt">' + Math.round(totalClicks).toLocaleString('en-GB') + ' clicks</div></div>' +
          '<div><div class="amlbl">CPA</div><div class="amval" style="color:' + cpaCol + '">' + fmtGBPd(blendedCPA) + '</div><div class="amtgt">Ceiling £15.90</div></div>' +
          '<div><div class="amlbl">Conversions</div><div class="amval">' + Math.round(totalConv) + '</div><div class="amtgt">Avg CPC ' + fmtGBPd(blendedCPC) + '</div></div>' +
        '</div>';
    }

    // ── Campaign breakdown table ──
    var campBody = document.getElementById('gads-camp-body');
    if (campBody) {
      campBody.innerHTML = CAMPAIGNS.map(function (c) {
        var cpa  = c.conv > 0 ? c.spend / c.conv : 0;
        var roas = c.spend > 0 ? c.conv_value / c.spend : 0;
        var cpaOk = cpa > 0 && cpa <= 15.90 ? 'style="color:var(--OK)"' : cpa > 18 ? 'style="color:var(--RED)"' : '';
        return '<tr>' +
          '<td><span class="pn">' + c.name + '</span></td>' +
          '<td class="r">' + fmtGBP(c.spend) + '</td>' +
          '<td class="r">' + Math.round(c.conv) + '</td>' +
          '<td class="r" ' + cpaOk + '>' + fmtGBPd(cpa) + '</td>' +
          '<td class="r">' + fmt2(roas) + 'x</td>' +
          '</tr>';
      }).join('');
    }

    // ── Search terms table ──
    var stBody = document.getElementById('mkt-gads-terms-body');
    if (stBody) {
      stBody.innerHTML = SEARCH_TERMS.slice(0, 10).map(function (t) {
        var cpa = t.conv > 0 ? t.cost / t.conv : 0;
        var cpaOk = cpa > 0 && cpa <= 15.90 ? 'style="color:var(--OK)"' : cpa > 20 ? 'style="color:var(--RED)"' : '';
        return '<tr>' +
          '<td>' + t.term + '</td>' +
          '<td class="r">' + Math.round(t.conv * 10) / 10 + '</td>' +
          '<td class="r">' + t.clicks + '</td>' +
          '<td class="r" ' + cpaOk + '>' + fmtGBPd(cpa) + '</td>' +
          '</tr>';
      }).join('');
    }

    // ── CPA targets table — wire live avg CPC ──
    var cpcEls = ['petite','cocoa','sig','pam','grand','pres'];
    cpcEls.forEach(function (id) {
      var el = document.getElementById('cpa-cpc-' + id);
      if (el) el.textContent = fmtGBPd(blendedCPC);
    });

    var clksPerSale = blendedCPC > 0 ? blendedCPA / blendedCPC : 0;
    var clsMap = { petite: 'cpa-cls-petite', cocoa: 'cpa-cls-cocoa', sig: 'cpa-cls-sig', pam: 'cpa-cls-pam', grand: 'cpa-cls-grand', pres: 'cpa-cls-pres' };
    Object.keys(clsMap).forEach(function (k) {
      var el = document.getElementById(clsMap[k]);
      if (el) el.textContent = Math.round(clksPerSale);
    });

    var avgEls = ['petite','cocoa','sig','pam','grand','pres'];
    avgEls.forEach(function (id) {
      var el = document.getElementById('cpa-avg-' + id);
      if (el) el.textContent = fmtGBPd(blendedCPA);
    });

    // ── Contribute to TACOS (spend figure for adspend-cache override) ──
    // Note: adspend-cache.js (from Coupler) is the authoritative TACOS source.
    // This component writes its MCP-sourced total as a fallback only if cache isn't loaded.
    window.EDEN._adSpend = window.EDEN._adSpend || {};
    if (!window.EDEN._adSpend.google_updated) {
      window.EDEN._adSpend.google = totalSpend;
    }
    if (window.EDEN.refreshAdTiles) window.EDEN.refreshAdTiles();

    console.log('[EDEN] Google Ads rendered (MCP 31 Mar). Spend: ' + fmtGBP(totalSpend) + ' | Conv: ' + Math.round(totalConv) + ' | ROAS: ' + fmt2(blendedROAS) + 'x | CPA: ' + fmtGBPd(blendedCPA));
  }

  window.EDEN.components['google-ads'] = { render: render };
})();
