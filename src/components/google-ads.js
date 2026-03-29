/**
 * EDEN & CO. CEO Flight Deck - Google Ads Component
 * Live data fetched from Google Ads MCP on 27 Mar 2026.
 * Refresh by re-running Google Ads MCP queries in Claude.
 */
window.EDEN = window.EDEN || {};
window.EDEN.components = window.EDEN.components || {};

(function () {
  'use strict';

  // ── Live data (last fetched: 27 Mar 2026) ────────────────────────────────

  var CAMPAIGNS = [
    { name: 'Search - Generic',           spend: 1515.11, clicks: 1579, conv: 77.22,  conv_value: 3871.75, avg_cpc: 0.96 },
    { name: 'PMAX',                        spend: 1193.35, clicks: 1407, conv: 81.86,  conv_value: 4029.54, avg_cpc: 0.85 },
    { name: 'Shopping - Brand',            spend: 145.55,  clicks: 206,  conv: 12.92,  conv_value: 808.99,  avg_cpc: 0.71 },
    { name: 'Search - Brand',              spend: 67.79,   clicks: 206,  conv: 14.03,  conv_value: 722.40,  avg_cpc: 0.33 },
    { name: 'Shopping - Generic (Catch)', spend: 1.30,    clicks: 35,   conv: 2.00,   conv_value: 44.40,   avg_cpc: 0.04 }
  ];

  var SEARCH_TERMS = [
    { term: 'gluten free hampers',         clicks: 71,  conv: 10.1, cost: 80.93,  cpc: 1.14 },
    { term: 'eden and co',                 clicks: 93,  conv: 6.0,  cost: 29.33,  cpc: 0.32 },
    { term: 'vegan hamper',                clicks: 86,  conv: 4.75, cost: 93.96,  cpc: 1.09 },
    { term: 'gluten free hamper',          clicks: 111, conv: 4.6,  cost: 112.43, cpc: 1.01 },
    { term: 'eden and co hampers',         clicks: 27,  conv: 3.0,  cost: 9.85,   cpc: 0.36 },
    { term: 'eden treats',                 clicks: 9,   conv: 3.0,  cost: 2.78,   cpc: 0.31 },
    { term: 'eden & co',                   clicks: 46,  conv: 2.0,  cost: 15.37,  cpc: 0.33 },
    { term: 'vegetarian gift hamper',      clicks: 3,   conv: 2.0,  cost: 3.86,   cpc: 1.29 },
    { term: 'vegan hamper uk',             clicks: 32,  conv: 2.0,  cost: 37.25,  cpc: 1.16 },
    { term: 'vegan hampers',               clicks: 26,  conv: 2.0,  cost: 40.64,  cpc: 1.56 },
    { term: 'dairy free hamper',           clicks: 14,  conv: 1.0,  cost: 11.39,  cpc: 0.81 },
    { term: 'dairy free hampers',          clicks: 4,   conv: 1.0,  cost: 8.18,   cpc: 2.05 },
    { term: 'gluten free gifts',           clicks: 10,  conv: 1.0,  cost: 8.74,   cpc: 0.87 },
    { term: 'vegetarian hampers',          clicks: 9,   conv: 1.0,  cost: 17.09,  cpc: 1.90 },
    { term: 'gluten free luxury hamper',   clicks: 5,   conv: 1.0,  cost: 5.46,   cpc: 1.09 },
    { term: 'gluten and dairy free hamper',clicks: 5,   conv: 1.0,  cost: 8.07,   cpc: 1.61 },
    { term: 'gluten and dairy free hampers',clicks: 5,  conv: 1.0,  cost: 8.07,   cpc: 1.61 }
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
    // ── Google Ads summary adblk ──
    var roasRag = ragCls(blendedROAS, 3.0, 2.5, false);
    var cpaRag  = ragCls(blendedCPA,  15.90, 18, true);

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
          '<div><div class="amlbl">ROAS MTD</div><div class="amval" style="color:' + roasCol + '">' + fmt2(blendedROAS) + 'x</div><div class="amtgt">Target 3x+</div></div>' +
          '<div><div class="amlbl">Spend MTD</div><div class="amval">' + fmtGBP(totalSpend) + '</div><div class="amtgt">' + Math.round(totalClicks).toLocaleString('en-GB') + ' clicks</div></div>' +
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

    // ── Search terms table (Google) ──
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

    // Avg CPA from live data (blended, product-level not yet available)
    // Clicks/sale = CPA / CPC
    var clksPerSale = blendedCPC > 0 ? blendedCPA / blendedCPC : 0;
    var clsMap = { petite: 'cpa-cls-petite', cocoa: 'cpa-cls-cocoa', sig: 'cpa-cls-sig', pam: 'cpa-cls-pam', grand: 'cpa-cls-grand', pres: 'cpa-cls-pres' };
    Object.keys(clsMap).forEach(function (k) {
      var el = document.getElementById(clsMap[k]);
      if (el) el.textContent = Math.round(clksPerSale);
    });

    // Avg CPA (blended — product split pending PMAX asset data)
    var avgEls = ['petite','cocoa','sig','pam','grand','pres'];
    avgEls.forEach(function (id) {
      var el = document.getElementById('cpa-avg-' + id);
      if (el) el.textContent = fmtGBPd(blendedCPA);
    });

    // ── Contribute to TACOS ──
    window.EDEN._adSpend = window.EDEN._adSpend || {};
    window.EDEN._adSpend.google = totalSpend;
    if (window.EDEN.refreshAdTiles) window.EDEN.refreshAdTiles();

    console.log('[EDEN] Google Ads rendered. Spend: ' + fmtGBP(totalSpend) + ' | Conv: ' + Math.round(totalConv) + ' | ROAS: ' + fmt2(blendedROAS) + 'x | CPA: ' + fmtGBPd(blendedCPA));
  }

  window.EDEN.components['google-ads'] = { render: render };
})();
